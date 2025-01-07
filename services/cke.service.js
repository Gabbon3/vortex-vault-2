import { Cripto } from "../utils/cryptoUtils.js";
import { User } from "../models/user.js";
import { Bytes } from "../utils/bytes.js";

export class CKEService {
    /**
     * Genera un nuovo cke
     * @param {string|Uint8Array} user_salt 
     * @returns 
     */
    async generate(uid, user_salt = null) {
        let salt = null;
        // ---
        if (user_salt === null) {
            const user = await User.findByPk(uid);
            salt = Bytes.hex.decode(user.salt);
        } else {
            salt = user_salt instanceof Uint8Array ? user_salt : Bytes.hex.decode(user_salt)
        }
        const cke = Cripto.random_bytes(32);
        const key = await this.key(cke, null, salt);
        // ---
        return {
            cke: Bytes.hex.encode(cke), key
        };
    }
    /**
     * Restituisce la chiave da usare per cifrare le credenziali nel localstorage
     * @param {string|Uint8Array} cke 
     * @param {Uint8Array} user_salt 
     */
    async key(cke_, uid, user_salt = null) {
        let salt = user_salt;
        // ---
        if (user_salt === null) {
            const user = await User.findByPk(uid);
            salt = Bytes.hex.decode(user.salt);
        }
        // ---
        const cke = cke_ instanceof Uint8Array ? cke_ : Bytes.hex.decode(cke_);
        const key = Cripto.hmac(salt, cke);
        return key;
    }
}