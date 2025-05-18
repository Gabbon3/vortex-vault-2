import { Cripto } from "../secure/cripto.js";
import { Bytes } from "./bytes.js";
import { API } from "./api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import msgpack from "./msgpack.min.js";

export class SecureLink {
    /**
     * Genera un nuovo link sicuro
     * @param {Object} options
     * @param {Uint8Array} [options.key] 
     * @param {string} [options.id] 
     * @param {string} [options.scope] *
     * @param {number} [options.ttl] * time to live
     */
    static async generate(options) {
        const key = options.key || Cripto.random_bytes(32);
        const data = msgpack.encode(options.data);
        const encrypted_data = await AES256GCM.encrypt(data, key);
        // ---
        const res = await API.fetch('/secure-link/', {
            method: 'POST',
            body: {
                id: options.id ?? null,
                scope: options.scope ?? '',
                ttl: options.ttl ?? 60 * 5,
                data: Bytes.base64.encode(encrypted_data),
            }
        });
        if (!res) return false;
        return {
            id: res.id,
            key: Bytes.base64.encode(key, true)
        };
    }
    /**
     * Richiede un id utilizzabile nel RedisDB
     * @returns {string} id della risorsa
     */
    static async request_id() {
        const res = await API.fetch('/secure-link/id', {
            method: 'POST',
        });
        if (!res) return false;
        return res.id;
    }
    /**
     * Restituisce il contenuto di un link sicuro
     * @param {string} scope
     * @param {string} id 
     * @param {Uint8Array|string} key_ 
     */
    static async get(scope, id, key_) {
        const res = await API.fetch(`/secure-link/${scope}_${id}`, {
            method: 'GET',
        });
        if (!res) return false;
        // ---
        const key = key_ instanceof Uint8Array ? key_ : Bytes.base64.decode(key_, true);
        // -- decodifico da msgpack e da base64 e decifro
        const decoded_data = Bytes.base64.decode(res.data);
        const data = await AES256GCM.decrypt(decoded_data, key);
        return msgpack.decode(data);
    }
}

// window.SecureLink = SecureLink;