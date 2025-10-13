import bcrypt from "bcryptjs";
import { CError } from "../helpers/cError.js";
import { User } from "../models/user.js";
import { Op } from "sequelize";
import { PoP } from "../protocols/PoP.node.js";
import { PublicKeyService } from "./publicKey.service.js";

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
     * Esegue il login dell'utente
     * @param {Request} request
     * @param {string} email
     * @param {string} publicKeyHex - chiave pubblica ECDSA del client in esadecimale
     * @param {string} ua - user agent del dispositivo
     * @returns {{ uid: string, salt: Uint8Array, dek: Uint8Array, jwt: string, chain: string }} uid, salt, dek, jwt e chain
     */
    async signin({ email, publicKeyHex, ua }) {
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
         * Genero l'access token e la chain
         */
        const { jwt, chain, jti } = await this.pop.generateAccessToken({ 
            uid: user.id,
            pub: publicKeyHex,
            chain: true,
            counter: 0
        });
        /**
         * Genero un record su PublicKey
         */
        await this.publicKeyService.create(jti, user.id, publicKeyHex, ua);
        // ---
        return { uid: user.id, salt: user.salt, dek: user.dek, jwt, chain };
    }

    /**
     * Elimina dal db la chiave pubblica
     * @param {string} publicKeyId - uuid v4
     */
    async signout(publicKeyId) {
        return await this.publicKeyService.delete({ id: publicKeyId });
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
