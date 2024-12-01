import { Bytes } from "./bytes.js";
import msgpack from "./msgpack.min.js";

export class SessionStorage {
    static prefix = 'vortex-vault';
    /**
     * Imposta una nuova risorsa sul sessio storage
     * @param {string} key referenza della risorsa sul session storage
     * @param {*} value puo essere qualsiasi tanto viene compressa con msgpack
     */
    static set(key, value) {
        sessionStorage.setItem(`${SessionStorage.prefix}-${key}`, Bytes.base64.to(msgpack.encode(value)));
    }
    /**
     * Restituisce una risorsa dal session storage
     * @param {string} key referenza della risorsa sul session storage
     * @returns {*}
     */
    static get(key) {
        const value = sessionStorage.getItem(`${SessionStorage.prefix}-${key}`);
        return value ? msgpack.decode(Bytes.base64.from(value)) : null;
    }
    /**
     * Elimina una risorsa sul session storage
     * @param {string} key referenza della risorsa sul session storage
     */
    static remove(key) {
        sessionStorage.removeItem(`${SessionStorage.prefix}-${key}`);
    }
}

window.SessionStorage = SessionStorage;