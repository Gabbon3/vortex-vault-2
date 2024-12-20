import { Bytes } from '../utils/bytes.js';
import { AES256GCM } from '../utils/aesgcm.js';
import { Cripto } from '../utils/cryptoUtils.js';
import dotenv from "dotenv";

dotenv.config();

export class MFAService {
    // -- importo la chiave per generare le chiavi dei segreti mfa
    static sign_key = Buffer.from(process.env.MFA_SECRET_KEY, 'hex');
    /**
     * Genera un segreto mfa
     * @returns {Uint8Array}
     */
    static generate() {
        const salt = Cripto.random_bytes(16);
        const secret = Cripto.random_bytes(20);
        // -- creo la chiave specifica per cifrare il segreto
        const key = Cripto.hmac(salt, MFAService.sign_key);
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
    static decrypt(final) {
        const salt = final.subarray(0, 16);
        const encrypted_secret = final.subarray(16);
        // -- derivo la chiave
        const key = Cripto.hmac(salt, MFAService.sign_key);
        // -- decifro il segreto
        const secret = AES256GCM.decrypt(encrypted_secret, key);
        return secret;
    }
}