import bcrypt from 'bcryptjs';
import { JWT } from "../utils/jwt.utils.js";
import { RefreshTokenService } from "./refreshToken.service.js";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { User } from '../models/user.js';
import { Roles } from '../utils/roles.js';
import { Mailer } from '../config/mail.js';
import automated_emails from '../public/utils/automated.mails.js';
import { RamDB } from '../config/ramdb.js';
import { Op } from 'sequelize';

export class UserService {
    constructor() {
        this.refresh_token_service = new RefreshTokenService();
    }
    /**
     * Registra un utente sul db
     * @param {string} email 
     * @param {string} password 
     * @returns {string} id dell'utente appena inserito
     */
    async signup(email, password) {
        email = email.toLowerCase();
        // -- verifico che l'indirizzo email sia valido
        if (!this.verify_email(email)) throw new CError("InvalidEmailDomain", "The email domain is not supported. Please use a well-known email provider like Gmail, iCloud, or Outlook.", 422);
        // -- verifico che l'email sia disponibile
        const user_exist = await User.findOne({
            where: { email }
        });
        if (user_exist) throw new CError("UserExist", "This email is already in use", 409);
        // -- genero il salt di 16 byte
        const salt = Cripto.random_bytes(16, 'hex');
        // -- creo un nuovo utente
        const password_hash = await this.hash_password(password);
        const user = new User({ email, password: password_hash, salt });
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
            'gmail.com',    // Google
            'icloud.com',   // Apple
            'outlook.com',  // Microsoft
            'hotmail.com',  // Microsoft (più vecchio, ma ancora usato)
            'yahoo.com',    // Yahoo
            'live.com',     // Microsoft
            'libero.it',    // Libero
            'tesisquare.com',// Tesisquare
        ];
        // ---
        return verified_domains.includes(email.split('@')[1]);
    }
    /**
     * Esegue l'accesso e restituisce:
     *  - *Utente (modello sequelize)
     *  - Access Token (stringa)
     *  - *Refresh Token (la stringa del hash token originale (non hashata))
     * Deve generare quelli marcati con *
     * @param {string} email 
     * @param {string} password 
     * @param {string} user_agent 
     * @param {string} ip_address
     * @param {string} refresh_token_string
     * @param {string} passKey
     * @returns {{ access_token: string, refresh_token: string, user: User }} - access_token, user
     */
    async signin(email, password, user_agent, ip_address, refresh_token_string, passKey) {
        // -- cerco se l'utente esiste
        const user = await User.findOne({
            where: { email }
        });
        if (!user) throw new CError("AuthenticationError", "Invalid email or password", 401);
        if (user.verified !== true) throw new CError("AuthenticationError", "Email is not verified", 401);

        // -- verifico se la password è corretta
        const password_is_correct = await this.verify_password(password, user.password);
        if (!password_is_correct) throw new CError("AuthenticationError", "Invalid email or password", 401);

        /**
         * Refresh Token
         */
        let refresh_token = null;
        let createNewRefreshToken = true;
        if (refresh_token_string) {
            // -- hash del refresh token
            const hash_current_token = this.refresh_token_service.get_token_digest(refresh_token_string);
            refresh_token = await this.refresh_token_service.verify({ token_hash: hash_current_token }, user_agent);
            
            /**
             * se False -> dispositivo bloccato
             * se Null -> creerò un nuovo refresh token (inizialmente revocato se non è il primo dispositivo a connettersi all'account)
             * se RefreshToken -> non ci sarà bisogno di creare nulla perchè è gia tutto in regola
             */
            if (refresh_token === false) throw new CError('', 'This device is locked', 403);
            else if (refresh_token === null) createNewRefreshToken = true;
            else createNewRefreshToken = false;
        }

        // -- creo il refresh token se richiesto
        if (createNewRefreshToken) refresh_token = await this.createRefreshToken(user, user_agent, ip_address, email, passKey); 
        console.log(refresh_token_string, refresh_token);
        /**
         * Genero l'access token solo se il refresh token NON è REVOCATO
         */
        const access_token = refresh_token.is_revoked ? null : JWT.genera_access_token({ uid: user.id, role: Roles.BASE });
        /**
         * APPROFONDIRE: da capire se generare il bypass anche con refresh non valido
         */
        const bypass_token = Cripto.bypass_token();
        RamDB.set(`byp-${bypass_token}`, { uid: user.id }, 30);
        /**
         * restituisco quindi l'access token se generato, il refresh token non hashato, il modello User e il bypass token se generato
         */
        return { access_token, refresh_token: refresh_token.plain, user, bypass_token };
    }
    /**
     * Crea e restituisce un refresh token
     * invia una mail di nuovo accesso se il refresh token viene inizialmente bloccato
     * motivo: non è il primo refresh token associato all'utente
     * @param {User} user - modello dello user
     * @param {string} user_agent 
     * @param {string} ip_address 
     * @param {string} email 
     * @param {string} passKey - stringa che se valida abilita a priori il refresh token -> viene creato un refresh valido
     * @returns {RefreshToken} 
     */
    async createRefreshToken(user, user_agent, ip_address, email, passKey) {
        // ottengo un Model di Refresh token dal suo servizio
        const refresh_token = await this.refresh_token_service.create(user.id, user_agent, ip_address, passKey);
        // -- avviso l'utente se un nuovo dispositivo accede
        if (refresh_token.is_revoked) {
            // -- ottengo il testo
            const { text, html } = automated_emails.newSignIn({
                email,
                user_agent: refresh_token.user_agent_summary,
                ip_address,
            });
            // -- invio la mail
            await Mailer.send(
                email, 
                'New device Sign-In', 
                text,
                html
            );
        }
        return refresh_token;
    }
    /**
     * Generate an advanced access token
     * @param {number} uid user id
     */
    async generate_sudo_access_token(uid) {
        const sudo_access_token = JWT.genera_access_token(
            { uid, role: Roles.SUDO }, 
            JWT.sudo_token_lifetime
        );
        return sudo_access_token;
    }
    /**
     * Esegue il cambio password
     * @param {number} uid 
     * @param {string} old_password 
     * @param {string} password 
     */
    async change_password(uid, old_password, password) {
        // -- verifico se la vecchia password è corretta
        // -- cerco se l'utente esiste
        const user = await this.find_by_id(uid);
        // -- cerco se la password è corretta
        const password_is_correct = await this.verify_password(old_password, user.password);
        if (!password_is_correct) throw new CError("AuthenticationError", "Password is not valid", 401);
        // ---
        const password_hash = await this.hash_password(password);
        return this.update_user_info({ id: uid }, { password: password_hash });
    }
    /**
     * Restituisce un utente tramite il suo id
     * @param {number} id 
     * @returns {Object}
     */
    async find_by_id(id) {
        return await User.findOne({
            where: { id },
        })
    }
    /**
     * Elimina un utente e tutti i dati associati
     * @param {number} id 
     * @returns {Object}
     */
    async delete_by_id(id) {
        return await User.destroy({
            where: { id }
        })
    }
    /**
     * Restituisce un utente tramite la sua email
     * @param {string} email 
     * @returns 
     */
    async find_by_email(email) {
        return await User.findOne({
            where: { email },
        })
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
            attributes: ['id', 'email'],
            where: {
                email: {
                    [Op.like]: `%${email}%` // Works in PostgreSQL
                }
            },
            limit: limit
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
        return await User.update(
            updated_info,
            { where }
        );
    }
    /**
     * Esegue l'hash della password utilizzando bcrypt
     * @param {string} password 
     * @returns {string}
     */
    async hash_password(password) {
        return await bcrypt.hash(password, 10);
    }
    /**
     * Verifica se una password corrisponde ad un hash usando bcrypt
     * @param {string} password 
     * @param {string} password_hash 
     * @returns {boolean}
     */
    async verify_password(password, password_hash) {
        return await bcrypt.compare(password, password_hash);
    }
}