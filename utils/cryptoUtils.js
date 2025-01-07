import crypto from 'crypto';
import { Bytes } from './bytes.js';

export class Cripto {
    /**
     * Genera una serie di byte casuali crittograficamente sicuri
     * @param {number} size numero di byte da generare casualmente del
     * @param {string} [encoding] - Formato della chiave Uint8Array di default se no: 'hex', 'base64'
     * @returns {string} byte generati
     */
    static random_bytes(size, encoding = null) {
        const bytes = crypto.randomBytes(size);
        return encoding ? bytes.toString(encoding) : new Uint8Array(bytes);
    }
    /**
     * Generate a high-entropy random number.
     * A secure replacement for Math.random().
     * @returns {number} A number in the range [0, 1).
     */
    static random_ratio() {
        const random_word = crypto.randomInt(0, 4294967296); // Generates a random integer from 0 to 2^32
        return random_word / 4294967296; // ~ 2 ** 32
    }
    /**
     * Genera un codice casuale a 6 cifre
     */
    static random_mfa_code() {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += '1234567890'[Math.floor(this.random_ratio() * 10)];
        }
        return code;
    }
    /**
     * Genera un hash HMAC di un messaggio con una chiave specifica.
     * @param {string|crypto.BinaryLike} message - Messaggio da crittografare.
     * @param {Buffer|string} key - Chiave segreta per l'HMAC; può essere una stringa o un buffer.
     * @param {Object} [options={}] - Opzioni per configurare l'HMAC.
     * @param {string} [options.key_encoding] - Encoding della chiave, se fornita come stringa (es: 'hex' o 'base64'). Se non specificato, si assume che `key` sia già un `Buffer`.
     * @param {string} [options.algo='sha256'] - Algoritmo di hash da usare per l'HMAC (es: 'sha256').
     * @param {string} [options.output_encoding='hex'] - Encoding per l'output HMAC, default 'hex'.
     * @returns {*} HMAC del messaggio in formato specificato.
     */
    static hmac(message, key, options = {}) {
        const key_buffer = options.key_encoding ? Buffer.from(key, options.key_encoding) : Buffer.from(key);
        // ---
        const hmac_buffer = crypto.createHmac(options.algo ?? 'sha256', key_buffer)
            .update(message)
            .digest();
        // ---
        return options.output_encoding ?
            hmac_buffer.toString(options.output_encoding) :
            new Uint8Array(hmac_buffer);
    }
    /**
     * Esegue hash con salt usando hmac
     * @param {string|crypto.BinaryLike} message 
     * @param {*} key 
     * @param {*} options 
     */
    static salting(message) {
        const salt = crypto.randomBytes(16);
        const hash = Buffer.from(this.hmac(message, salt));
        return new Uint8Array(Buffer.concat([salt, hash]));
    }
    /**
     * Verifica un salting
     * @param {string|crypto.BinaryLike} message 
     * @param {Uint8Array} salt_hash 
     * @returns {boolean}
     */
    static verify_salting(message, salt_hash) {
        const salt = salt_hash.subarray(0, 16);
        const hash = salt_hash.subarray(16);
        // ---
        const new_hash = this.hmac(message, salt);
        return Buffer.compare(hash, new_hash) === 0;
    }
    /**
     * Calcola l'hash di un messaggio.
     * @param {string} message - Messaggio da hashare.
     * @param {Object} [options={}] - Opzioni per configurare l'hash.
     * @param {string} [options.algorithm='sha256'] - Algoritmo di hash da usare (es: 'sha256').
     * @param {string} [options.encoding='hex'] - Encoding per l'output hash, default 'hex'.
     * @returns {string} Hash del messaggio in formato specificato.
     */
    static hash(message, options = {}) {
        const hash_buffer = crypto.createHash(options.algorithm ?? 'sha256')
            .update(message)
            .digest();
        // ---
        return options.encoding ?
            hash_buffer.toString(options.encoding) :
            new Uint8Array(hash_buffer);
    }
}