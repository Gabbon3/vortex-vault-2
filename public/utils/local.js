import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "./bytes.js";
import * as msgpack from "./msgpack.min.js";

export class LocalStorage {
    static prefix = 'vortex-vault';
    static key = null;
    /**
     * Imposta la chiave crittografica con la quale cifrare e decifrare il localstorage
     * @param {Uint8Array} key - una chiave crittografica
     */
    static setKey(key) {
        LocalStorage.key = Bytes.hex.from(key);
    }
    /**
     * Salva qualcosa sul localstorage
     * @param {string} key 
     * @param {string} value 
     * @param {boolean} [encrypt=false] 
     */
    static async set(key, value, encrypt = false) {
        const buffer = msgpack.encode(value);
        // ---
        const data = encrypt ? await AES256GCM.encrypt(buffer, this.key) : buffer;
        // ---
        localStorage.setItem(`${LocalStorage.prefix}-${key}`, Bytes.base64.to(data));
    }
    /**
     * Ricava qualcosa dal localstorage
     * @param {string} key 
     * @param {boolean} [decrypt=false] 
     * @returns {string|Object}
     */
    static async get(key, decrypt = false) {
        const data = localStorage.getItem(`${LocalStorage.prefix}-${key}`);
        if (!data) return null;
        // ---
        const buffer = Bytes.base64.from(data);
        let value = decrypt ? await AES256GCM.decrypt(buffer, this.key) : buffer;
        return msgpack.decode(value);
    }
    /**
     * Rimuover dal localstorage un elemento
     * @param {string} key 
     */
    static remove(key) {
        localStorage.removeItem(`${LocalStorage.prefix}-${key}`);
    }
}