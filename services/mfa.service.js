import { Bytes } from '../utils/bytes.js';
import { AES256GCM } from '../utils/aesgcm.js';
import { Cripto } from '../utils/cryptoUtils.js';
import "dotenv/config";

export class MFAService {
    // -- importo le chiavi per generare le chiavi dei segreti multifattore
    static keys = Buffer.from(process.env.MFA_KEYS, 'hex');
    /**
     * Restituisce la chiave env associata ad un utente
     * @param {number} uid 
     * @param {Uint8Array} salt 
     * @returns {Buffer}
     */
    static get_key(uid, salt) {
        // -- calcolo l'indice della chiave da utilizzare
        const base = Bytes.bigint.decode(Cripto.hmac(`${uid}`, salt));
        const index = Number(base % 16n);
        // -- calcolo le posizioni per ottenere la chiave
        const start = index * 32;
        const end = start + 32;
        const env_key = this.keys.subarray(start, end);
        // -- calcolo la chiave
        const key = Cripto.hmac(salt, env_key);
        return key;
    }
    /**
     * Genera un segreto mfa
     * @param {number} uid 
     * @returns {Uint8Array}
     */
    static generate(uid) {
        const salt = Cripto.random_bytes(32);
        const secret = Cripto.random_bytes(20);
        // -- ottengo la chiave
        const key = this.get_key(uid, salt);
        // -- cifro il segreto
        const encrypted_secret = AES256GCM.encrypt(secret, key);
        // ---
        return {
            final: Bytes.merge([salt, encrypted_secret], 8),
            secret,
        };
    }
    /**
     * Restituisce il segreto mfa decifrato
     * @param {Uint8Array} final - salt + segreto mfa cifrato
     * @return {Uint8Array} il segreto mfa decifrato
     */
    static decrypt(uid, final) {
        const salt = final.subarray(0, 32);
        const encrypted_secret = final.subarray(32);
        // -- ottengo la chiave env
        const key = this.get_key(uid, salt);
        // -- decifro il segreto
        const secret = AES256GCM.decrypt(encrypted_secret, key);
        return secret;
    }
}