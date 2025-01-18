import { Cripto } from "../utils/cryptoUtils.js";
import { User } from "../models/user.js";
import { Bytes } from "../utils/bytes.js";

export class LSKService {
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
        const lsk = await this.lsk(cke, null, salt);
        // ---
        return {
            cke: Bytes.hex.encode(cke), lsk
        };
    }
    /**
     * Restituisce la chiave da usare per cifrare le credenziali nel localstorage
     * anche nota come Local Storage Key
     * @param {string|Uint8Array} cke 
     * @param {Uint8Array} user_salt 
     * @returns {Uint8Array} Local Storage Key
     */
    async lsk(cke_, uid, user_salt = null) {
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