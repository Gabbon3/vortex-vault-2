import bcrypt from "bcryptjs";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { User } from "../models/user.js";
import { Mailer } from "../config/mail.js";
import emailContents from "../docs/utils/automated.mails.js";
import { RedisDB } from "../config/redisdb.js";
import { Op } from "sequelize";
import { SHIV } from "../protocols/SHIV.node.js";
import { AuthKeys } from "../models/authKeys.model.js";
import { DPoP } from "../protocols/DPoP.server.js";
import { Config } from "../server_config.js";

export class UserService {
    constructor() {
        this.shiv = new SHIV();
        this.dpop = new DPoP({
            privateKey: Config.DPOP_PRIVATE_KEY,
        });
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
                "The email domain is not supported. Please use a well-known email provider like Gmail, iCloud, or Outlook.",
                422
            );
        // -- verifico che l'email sia disponibile
        const user_exist = await User.findOne({
            where: { email },
        });
        if (user_exist)
            throw new CError("UserExist", "This email is already in use", 409);
        // -- creo un nuovo utente
        const passwordHash = await this.hashPassword(password);
        const user = new User({
            email,
            password: passwordHash,
            salt: salt,
            dek: DEK
        });
        // ---
        return await user.save();
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
     * Esegue il login e genera token DPoP
     * @param {Object} params
     * @param {Object} params.request - Request HTTP
     * @param {string} params.email - Email dell'utente
     * @param {Object} [params.jwkPublicKey] - Chiave pubblica JWK per DPoP (opzionale)
     * @returns {Promise<{uid: string, salt: string, dek: Buffer, jwt: string, bypassToken: string}>}
     */
    async signin({ request, email, jwkPublicKey }) {
        // 1. Verifica esistenza utente
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new CError("AuthenticationError", "Invalid email", 401);
        }

        if (user.verified !== true) {
            throw new CError("AuthenticationError", "Email is not verified", 401);
        }

        // 2. Preparazione dati per token
        const userAgentSummary = request.headers['user-agent'];
        const ipAddress = request.headers["x-forwarded-for"] || request.socket.remoteAddress;

        // 3. Genera token DPoP se fornita la chiave pubblica
        // -- calcola thumbprint della chiave client
        const thumbprint = this.dpop.computeJwkThumbprint(jwkPublicKey);
        // -- genera access token con binding
        const jwt = await this.dpop.createAccessToken(
            {
                sub: user.id,
                email: user.email
            },
            thumbprint,
            {
                expiresIn: '14d'
            }
        );

        // TODO: Salva la chiave pubblica associata all'utente
        // await this._storeClientPublicKey(user.id, jwkPublicKey);

        // 4. Notifica login via email
        const { text, html } = await emailContents.newSignIn({
            email,
            user_agent: userAgentSummary,
            ip_address: ipAddress,
        });
        Mailer.send(email, "New device Sign-In", text, html);

        // 5. Genera bypass token
        const cripto = new Cripto();
        const bypassToken = cripto.bypassToken();
        await RedisDB.set(`byp-${bypassToken}`, { uid: user.id }, 60);

        // 6. Restituisci response
        return {
            uid: user.id,
            salt: user.salt,
            dek: user.dek,
            jwt,
            bypassToken
        };
    }

    /**
     * Elimina dal db la auth key
     * @param {string} guid
     */
    async signout(guid) {
        const kid = await this.shiv.calculateKid(guid);
        // ---
        return await AuthKeys.destroy({
            where: {
                kid: kid,
            },
        });
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
        return await User.update({
            password: newPasswordHash,
            dek: dek,
        }, {
            where: { id: uid },
        });
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
