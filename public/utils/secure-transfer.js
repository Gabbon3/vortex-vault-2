import { Cripto } from "../secure/cripto.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { API } from "./api.js";
import msgpack from "./msgpack.min.js";
import { Bytes } from "./bytes.js";

/*
il pc genera il codice alfanumerico 8-12 caratteri (maiuscoli).
il telefono lo trascrive e:
 - genera un salt casuale
 - deriva la chiave crittografica unendo il codice con il salt
 - cifra le credenziali
 - calcola l'id della richiesta che è calcolato tramite sha-1(codice)
 - invia al server le credenziali cifrate, l'id della richiesta, salt

quando l'utente ha fatto con il telefono poi clicca un pulsante sul pc per tentare di ottenere le credenziali, quindi per richiedere la risorsa il pc:
 - calcola sha-1(codice)
 - ottiene le risorse
 - calcola la chiave usando il salt e il codice
 - decifra le credenziali
*/

export class SecureTransfer {
    /**
     * Restituisce un codice casuale da usare in questo contesto
     * @returns {string}
     */
    static random_code() {
        return Cripto.random_alphanumeric_code(8, null);
    }
    /**
     * Imposta una risorsa cifrata sul RamDB
     * @param {Object} options 
     * @param {string} [options.scope] - scopo del trasferimento
     * @param {string} [options.code] - un codice alfanumerico
     * @param {number} [options.ttl] - tempo di vita della risorsa sul server
     * @param {boolean} [options.passKey] - true per emettere una passkey
     * @param {*} [options.data] - dati da trasferire
     * @returns {boolean}
     */
    static async set(options) {
        const encoded_data = msgpack.encode(options.data);
        // -- genero il salt e derivo la chiave
        const salt = Cripto.random_bytes(16);
        const key = await Cripto.derive_key(options.code, salt);
        // -- cifro i dati
        const encrypted_data = await AES256GCM.encrypt(encoded_data, key);
        // -- unisco l'id ai dati cifrati
        const data = Bytes.merge([salt, encrypted_data], 8);
        // -- calcolo l'id della richiesta unendo lo scope con lo SHA-1(codice)
        const request_id = options.scope + Bytes.base64.to(await Cripto.hash(options.code, { algorithm: 'SHA-1' }), true);
        // -- invio al server
        const res = await API.fetch('/secure-transfer/', {
            method: 'POST',
            body: {
                request_id,
                ttl: options.ttl ?? 180,
                passKey: options.passKey ?? false,
                data: Bytes.base64.to(data)
            }
        });
        if (!res) return false;
        return true;
    }
    /**
     * Restituisce i dati di un trasferimento sicuro
     * @param {string} scope 
     * @param {string} code 
     * @returns {*}
     */
    static async get(scope, code) {
        // -- calcolo l'id della richiesta
        const request_id = scope + Bytes.base64.to(await Cripto.hash(code, { algorithm: 'SHA-1' }), true);
        // -- ottengo le risorse
        const res = await API.fetch(`/secure-transfer/${request_id}`, {
            method: 'GET'
        });
        if (!res) return false;
        const decoded_data = Bytes.base64.from(res.data);
        // -- ottengo salt e dati
        const salt = decoded_data.subarray(0, 16);
        const encrypted_data = decoded_data.subarray(16);
        // -- calcolo la chiave
        const key = await Cripto.derive_key(code, salt);
        // -- decifro i dati
        const data = await AES256GCM.decrypt(encrypted_data, key);
        return { data: msgpack.decode(data), passKey: res.passKey };
    }
}

window.SecureTransfer = SecureTransfer;