import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "./bytes.js";
import msgpack from "./msgpack.min.js";

export class LocalStorage {
    static prefix = 'vortex-vault';
    static key = null;
    /**
     * Salva qualcosa sul localstorage
     * @param {string} key nome di riferimento della risorsa nel local storage
     * @param {string} value 
     * @param {Uint8Array} crypto_key se un Uint8Array verrà eseguita la crittografia del value 
     */
    static async set(key, value, crypto_key = null) {
        const buffer = msgpack.encode(value);
        // ---
        const data = crypto_key instanceof Uint8Array ? await AES256GCM.encrypt(buffer, crypto_key) : buffer;
        // ---
        localStorage.setItem(`${LocalStorage.prefix}-${key}`, Bytes.base64.to(data));
    }
    /**
     * Ricava qualcosa dal localstorage
     * @param {string} key nome di riferimento della risorsa nel local storage
     * @param {Uint8Array} crypto_key se diverso da null verrà eseguita la decifratura del value
     * @returns {Promise<string|Object>}
     */
    static async get(key, crypto_key = null) {
        const data = localStorage.getItem(`${LocalStorage.prefix}-${key}`);
        if (!data) return null;
        // ---
        const buffer = Bytes.base64.from(data);
        let value = crypto_key instanceof Uint8Array ? await AES256GCM.decrypt(buffer, crypto_key) : buffer;
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

window.LocalStorage = LocalStorage;