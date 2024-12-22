import { Cripto } from "../secure/cripto.js";
import { Bytes } from "./bytes.js";
import { API } from "./api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import msgpack from "./msgpack.min.js";

export class SecureLink {
    /**
     * Genera un nuovo link sicuro
     * @param {{ scope: string, ttl: number, data: *, passKey: boolean}} options 
     */
    static async generate(options) {
        const key = Cripto.random_bytes(32);
        const data = msgpack.encode(options.data);
        const encrypted_data = await AES256GCM.encrypt(data, key);
        // ---
        const res = await API.fetch('/secure-link/', {
            method: 'POST',
            body: {
                scope: options.scope ?? '',
                ttl: options.ttl ?? 60 * 5,
                data: Bytes.base64.to(encrypted_data),
                passKey: options.passKey ?? false,
            }
        });
        if (!res) return false;
        return {
            id: res.id,
            key: Bytes.base64.to(key, true)
        };
    }
    /**
     * Restituisce il contenuto di un link sicuro
     * @param {string} scope
     * @param {string} id 
     * @param {string} key_base64 
     */
    static async get(scope, id, key_base64) {
        const res = await API.fetch(`/secure-link/${scope}_${id}`, {
            method: 'GET',
        });
        if (!res) return false;
        // ---
        const key = Bytes.base64.from(key_base64, true);
        // -- decodifico da msgpack e da base64 e decifro
        const decoded_data = Bytes.base64.from(res.data);
        const data = await AES256GCM.decrypt(decoded_data, key);
        return msgpack.decode(data);
    }
}

window.SecureLink = SecureLink;