import bcrypt from "bcryptjs";
import { CError } from "../helpers/cError.js";
import { User } from "../models/user.js";
import { Op } from "sequelize";
import { PoP } from "../protocols/PoP.node.js";
import { PublicKeyService } from "./publicKey.service.js";
import { Config } from "../server_config.js";
import { RedisDB } from "../config/redisdb.js";
import { Mailer } from "../config/mail.js";
import emailContents from "../docs/utils/automated.mails.js";

export class UserService {
    constructor() {
        this.pop = new PoP();
        this.publicKeyService = new PublicKeyService();
    }
    /**
     * Registra un utente sul db
     * @param {string} email
     * @param {string} password
     * @param {Uint8Array} DEK - la DEK cifrata con la KEK
     * @param {Uint8Array} salt - il salt casuale dell'utente
     * @returns {string} id dell'utente appena inserito
     */
    async signup(email, password, DEK, salt) {
        email = email.toLowerCase();
        // -- verifico che l'indirizzo email sia valido
        if (!this.verify_email(email))
            throw new CError(
                "InvalidEmailDomain",
                "Questa email non può essere utilizzata sui nostri sistemi",
                409
            );
        // -- verifico che l'email sia disponibile
        const user_exist = await User.findOne({
            where: { email },
        });
        if (user_exist)
            throw new CError("UserExist", "Questa email non può essere utilizzata sui nostri sistemi", 409);
        // -- creo un nuovo utente
        const passwordHash = await this.hashPassword(password);
        // -- salvo su redis finche non verifica la mail se no elimino account subito
        const user = {
            email,
            password: passwordHash,
            salt: salt,
            dek: DEK,
        };
        RedisDB.set('pending-user-' + email, user, 300); // 5 minuti
        // ---
        return true;
    }
    /**
     * Utility per verificare l'email dell'utente
     * @param {string} email
     * @returns {boolean}
     */
    verify_email(email) {
        const verified_domains = [
            "gmail.com", // Google
            "icloud.com", // Apple
            "outlook.com", // Microsoft
            "hotmail.com", // Microsoft (più vecchio, ma ancora usato)
            "yahoo.com", // Yahoo
            "live.com", // Microsoft
            "libero.it", // Libero
            "tesisquare.com", // Tesisquare
            "edu.itspiemonte.it", // ITS
        ];
        // ---
        return verified_domains.includes(email.split("@")[1]);
    }

    /**
     * Conferma un utente e lo memorizza sul database
     * @param {string} email stringa email dell'utente da confermare
     */
    async confirmPendingUser(email) {
        const pendingUser = await RedisDB.getdel('pending-user-' + email);
        if (!pendingUser) {
            throw new CError("ValidationError", "Nessun utente in attesa di conferma per questa email o tempo scaduto", 422);
        }
        // -- creo l'utente sul db
        const user = await User.create({
            email: pendingUser.email,
            password: pendingUser.password,
            salt: pendingUser.salt,
            dek: pendingUser.dek,
            verified: true,
        });
        return await user.save();
    }

    /**
     * Esegue il login dell'utente
     * @param {Request} request
     * @param {string} email
     * @param {string} publicKeyB64 - chiave pubblica ECDSA del client in base64 urlsafe
     * @param {string} ua - user agent del dispositivo
     * @param {string} ip - indirizzo ip del dispositivo
     * @param {string|null} sessionId - opzionale, se presente indica l'ID della sessione (id della tabella public keys)
     * @returns {{ uid: string, salt: Uint8Array, dek: Uint8Array, jwt: string, chain: string }} uid, salt, dek, jwt e chain
     */
    async signin({ email, publicKeyB64, ua, ip, sessionId = null }) {
        // -- cerco se l'utente esiste
        const user = await User.findOne({
            where: { email },
        });
        if (!user)
            throw new CError("AuthenticationError", "Email inesistente", 401);
        if (user.verified !== true)
            throw new CError(
                "AuthenticationError",
                "Email non verificata",
                401
            );
        /**
         * Se viene passato l'id della vecchia sessione (sessionId) la elimino
         * in modo da evitare che rimangano sessioni orfane
         */
        if (sessionId) {
            await this.publicKeyService.delete({
                sid: sessionId,
                user_id: user.id,
            });
        }
        /**
         * Elimino le sessioni più vecchie di 14 giorni (periodo di vita del jwt nei cookie)
         */
        const jwtLifetimeBound = Date.now() - Config.AUTH_TOKEN_COOKIE_EXPIRY;
        await this.publicKeyService.deleteAll({
            user_id: user.id,
            id: null,
            last_seen_at: { [Op.lt]: new Date(jwtLifetimeBound) },
        });
        /**
         * Genero l'access token e la chain
         */
        const { jwt, chain, sid } = await this.pop.generateAccessToken({
            uid: user.id,
            pub: publicKeyB64,
            chain: true,
            counter: 0,
        });
        /**
         * Genero un record su PublicKey
         */
        await this.publicKeyService.create(sid, user.id, publicKeyB64, ua);
        /**
         * Invio una mail per avvisare l'utente del nuovo login
         */
        const { text, html } = await emailContents.newSignIn({ email, user_agent: ua, ip_address: ip });
        Mailer.send(email, "Vortex Vault - Nuovo login", text, html);
        // ---
        return { uid: user.id, salt: user.salt, dek: user.dek, jwt, chain };
    }

    /**
     * Rigenera un access token a partire da un nonce firmato
     * @param {string} signedNonce base64 firmato con chiave privata del client
     * @param {string} nonce stringa esadecimale da 40 caratteri (20 byte)
     * @param {Object} payload payload del jwt, cosi posso riprendere i dati e rigenerare il token
     * @returns {{ jwt: string, chain: string }}
     */
    async refreshAccessToken(signedNonce, nonce, payload) {
        // -- verifico che il nonce esista
        const exists = await RedisDB.getdel(`nonce-${nonce}`);
        if (!exists)
            throw new CError(
                "ValidationError",
                "Nonce non valido o scaduto",
                422
            );
        // -- verifico la firma
        const isValid = await this.pop.verifyNonceSignature(
            nonce,
            signedNonce,
            payload.pub
        );
        if (!isValid) {
            throw new CError("AuthenticationError", "Firma non valida", 401);
        }
        /**
         * Verifico se la sessione esiste ancora sul db
         */
        let session = await this.publicKeyService.get({ sid: payload.sid });
        if (!session) {
            throw new CError(
                "AuthenticationError",
                "Sessione non valida",
                401
            );
        }
        session = null;
        // -- se è tutto ok rigenero un access token
        const { jwt, chain } = await this.pop.generateAccessToken({
            uid: payload.uid,
            pub: payload.pub,
            sid: payload.sid,
            chain: true,
            counter: 0,
        });
        // -- aggiorno public key last_used_at
        const [count] = await this.publicKeyService.update(
            { sid: payload.sid },
            { last_seen_at: new Date() }
        );
        // ---
        return { jwt, chain };
    }
    /**
     * Elimina dal db la chiave pubblica
     * @param {string} sessionId - uuid v7
     */
    async signout(sessionId) {
        return await this.publicKeyService.delete({ sid: sessionId });
    }

    /**
     * Esegue il cambio password
     * @param {number} uid
     * @param {string} newPassword
     * @param {Array} dek la dek cifrata con la nuova kek
     */
    async changePassword(uid, newPassword, dek) {
        const newPasswordHash = await this.hashPassword(newPassword);
        // -- aggiorno la password
        return await User.update(
            {
                password: newPasswordHash,
                dek: dek,
            },
            {
                where: { id: uid },
            }
        );
    }
    /**
     * Restituisce un utente tramite il suo id
     * @param {number} id
     * @returns {Object}
     */
    async find_by_id(id) {
        return await User.findOne({
            where: { id },
        });
    }
    /**
     * Elimina un utente e tutti i dati associati
     * @param {number} id
     * @returns {Object}
     */
    async delete_by_id(id) {
        return await User.destroy({
            where: { id },
        });
    }
    /**
     * Restituisce un utente tramite la sua email
     * @param {string} email
     * @returns
     */
    async find_by_email(email) {
        return await User.findOne({
            where: { email },
        });
    }
    /**
     * Restituisce tutti gli utenti
     * ricercando in like sugli utenti %email%
     * @param {string} email
     * @param {number} limit
     * @returns {Array}
     */
    async search(email, limit = 25) {
        return await User.findAll({
            attributes: ["id", "email"],
            where: {
                email: {
                    [Op.like]: `%${email}%`, // Works in PostgreSQL
                },
            },
            limit: limit,
        });
    }
    /**
     * Aggiorna un qualunque campo dell'utente
     * @param {string} id - user id
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns {Array} [affectedCount]
     */
    async update_user_info({ id, email }, updated_info) {
        const where = id ? { id } : { email };
        // ---
        return await User.update(updated_info, { where });
    }
    /**
     * Esegue l'hash della password utilizzando bcrypt
     * @param {string} password
     * @returns {string}
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, 12);
    }
    /**
     * Verifica se una password corrisponde ad un hash usando bcrypt
     * @param {string} password
     * @param {string} password_hash
     * @returns {boolean}
     */
    async verifyPassword(password, password_hash) {
        return await bcrypt.compare(password, password_hash);
    }
}
