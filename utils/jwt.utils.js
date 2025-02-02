import jwt from "jsonwebtoken";
import { AES256GCM } from "./aesgcm.js";
import { Config } from "../server_config.js";

export class JWT {
    // ---
    /**
     * Raccolta delle chiavi da usare nei tokens
     */
    static keys = {
        default: Config.ACCESS_TOKEN_SECRET, // chiave per firmare i jwt base
        passkey: Config.PASSKEY_TOKEN_SECRET, // chiave per firmare i jwt emessi da passkeys
        encrypt: Config.TOKEN_KEY, // chiave per cifrare i jwt
    }
    // -- proprietà dei jwt o cookie
    static secure_option = true;
    // -- tempo di vita dei token in secondi
    static passkey_token_lifetime = 10 * 60;
    static sudo_token_lifetime = 45 * 60;
    static access_token_lifetime = 60 * 60; // 30 ora
    static cke_lifetime = 60 * 60 * 24 * 31; // 31 giorni
    // -- tempo di vita dei cookie
    static access_token_cookie_lifetime = 60 * 60 * 24 * 31 * 1000; // 31 giorni
    static sudo_token_cookie_lifetime = 20 * 60 * 1000; // 31 giorni
    static refresh_token_cookie_lifetime = 60 * 60 * 24 * 365 * 1000; // 1 anno
    static cke_cookie_lifetime = 60 * 60 * 24 * 31 * 1000; // 31 giorni
    // -- cifra il contenuto del token
    static encrypt = false;

    /**
     * Genera un access token con scadenza di 1 ora
     * @param {Object} payload - payload
     * @param {number} lifetime - tempo di scadenza in secondi
     * @returns {string} - access token
     */
    static genera_access_token(payload, lifetime = this.access_token_lifetime) {
        const now = Math.floor(Date.now() / 1000);
        // ---
        const token = jwt.sign(
            {
                ...payload,
                iat: now,
                exp: now + lifetime,
            },
            this.keys.default
        );
        // -- cifro il token se richiesto
        if (this.encrypt) {
            const encrypted_token = AES256GCM.encrypt(
                Buffer.from(token),
                this.keys.encrypt
            );
            return encrypted_token.toString("base64");
        }
        // ---
        return token;
    }
    /**
     * Genera un generico token JWT
     * @param {object} payload oggetto che racchiude le informazioni del token, non inserire exp e iat che sono già gestiti
     * @param {number} lifetime numeri di secondi che indica la durata di validità di un jwt
     * @param {string} key nome della chiave da usare tra quelle disponibili in 'JWT.keys'
     * @returns {string} JWT token generico
     */
    static sign(payload, lifetime, key) {
        const now = Math.floor(Date.now() / 1000);
        // -- genero il JWT
        const token = jwt.sign({
            ...payload,
            iat: now,
            exp: now + lifetime
        }, this.keys[key]);
        // -- restituisco il token
        return token;
    }
    /**
     * Verifica un token JWT restituendo il payload
     * @param {string} token stringa del token JWT
     * @param {string} key nome della chiave da utilizzare
     * @returns 
     */
    static verify(token, key) {
        try {
            // -- provo a verificare il jwt
            // - se invalido lancerà un errore quindi lo catturo
            // - e restituisco null
            return jwt.verify(token, this.keys[key]);
        } catch (error) {
            // -- il token non è valido
            return null;
        }
    }

    /**
     * Verifica un access token
     * @param {string} access_token - Il token da verificare
     * @returns {Promise<Object>} - L'oggetto utente decodificato se valido
     */
    static verifica_access_token(access_token) {
        if (this.encrypt) {
            const token = AES256GCM.decrypt(
                Buffer.from(access_token, "base64"),
                this.keys.encrypt
            ).toString();
            return this.verifica_token(token, this.keys.default);
        }
        // ---
        return this.verifica_token(access_token, this.keys.default);
    }

    /**
     * Verifica un token generico
     * @param {string} token - access o refresh token
     * @param {string} secret - Segreto dell'access o del refresh token
     * @returns {Promise<Object>} - L'oggetto utente decodificato se valido
     */
    static verifica_token(token, secret) {
        try {
            // -- provo a verificare il jwt
            // -- se invalido lancerà un errore quindi lo catturo
            // -- e restituisco null
            return jwt.verify(token, secret);
        } catch (error) {
            // -- il token non è valido
            return null;
        }
    }
}
