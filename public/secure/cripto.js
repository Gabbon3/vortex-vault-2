import { Bytes } from "../utils/bytes.js";

/**
 * Classe statica per operazioni crittografiche usando le Web Crypto API.
 */
export class Cripto {
    /**
     * Genera una serie di byte casuali crittograficamente sicuri.
     * @param {number} size - Numero di byte da generare casualmente.
     * @param {string} [encoding=null] - Formato dell'output (optional: 'hex' o 'base64').
     * @returns {string|Uint8Array} - Byte generati nel formato specificato.
     */
    static random_bytes(size, encoding = null) {
        const bytes = crypto.getRandomValues(new Uint8Array(size));
        // -- se l'encoding è hex o base64, utilizzo la classe Bytes per la conversione
        if (encoding === 'hex') {
            return Bytes.hex.to(bytes);
        } else if (encoding === 'base64') {
            return Bytes.base64.to(bytes);
        } else {
            return bytes;
        }
    }
    /**
     * Genera un codice di recupero crittograficamente sicuro
     * @param {number} size 
     * @returns {string}
     */
    static random_recovery_code(size = 20) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        let recovery_code = "";
        const buffer = new Uint8Array(size);
        window.crypto.getRandomValues(buffer);
        // ---
        for (let i = 0; i < size; i++) {
            recovery_code += chars[buffer[i] % chars.length];
        }
        // ---
        return recovery_code.match(/.{1,4}/g).join('-');
    }

    /**
     * Genera un hash HMAC di un messaggio con una chiave specifica.
     * @param {string | Uint8Array} message - Messaggio da crittografare.
     * @param {Uint8Array} key - Chiave segreta per l'HMAC.
     * @param {Object} [options={}] - Opzioni per configurare l'HMAC.
     * @param {string} [options.key_encoding] - Encoding della chiave (es: 'hex' o 'base64').
     * @param {string} [options.algo='SHA-256'] - Algoritmo di hash da usare per l'HMAC.
     * @param {string} [options.output_encoding='hex'] - Encoding per l'output HMAC, default 'hex'.
     * @returns {Promise<string|Uint8Array>} - HMAC del messaggio in formato specificato.
     */
    static async hmac(message, key, options = {}) {
        const message_bytes = message instanceof Uint8Array ? message : new TextEncoder().encode(message);
        // ---
        const crypto_key = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: { name: options.algo || 'SHA-256' } },
            false,
            ['sign']
        );
        // -- genero l'HMAC
        const hmac_buffer = await crypto.subtle.sign('HMAC', crypto_key, message_bytes);
        // -- converto l'output nel formato desiderato (hex, base64 o Uint8Array)
        if (options.output_encoding === 'hex') {
            return Bytes.hex.to(new Uint8Array(hmac_buffer));
        } else if (options.output_encoding === 'base64') {
            return Bytes.base64.to(new Uint8Array(hmac_buffer));
        } else {
            return new Uint8Array(hmac_buffer);
        }
    }

    /**
     * Calcola l'hash di un messaggio.
     * @param {string | Uint8Array} message - Messaggio da hashare.
     * @param {Object} [options={}] - Opzioni per configurare l'hash.
     * @param {string} [options.algorithm='SHA-256'] - Algoritmo di hash da usare (es: 'SHA-256').
     * @param {string} [options.encoding='hex'] - Encoding per l'output hash, default 'hex'.
     * @returns {Promise<string|Uint8Array>} - Hash del messaggio in formato specificato.
     */
    static async hash(message, options = {}) {
        const hashBuffer = await crypto.subtle.digest(
            { name: options.algorithm || 'SHA-256' },
            message instanceof Uint8Array ? message : new TextEncoder().encode(message)
        );
        // -- converto l'output nel formato desiderato (hex, base64 o Uint8Array)
        if (options.encoding === 'hex') {
            return Bytes.hex.to(new Uint8Array(hashBuffer));
        } else if (options.encoding === 'base64') {
            return Bytes.base64.to(new Uint8Array(hashBuffer));
        } else {
            return new Uint8Array(hashBuffer);
        }
    }

    /**
     * Deriva una chiave crittografica da una password usando PBKDF2.
     * @param {string | Uint8Array} password - La password da usare per derivare la chiave.
     * @param {Uint8Array} salt - Il sale utilizzato nel processo di derivazione.
     * @param {number} [iterations=16] - Il numero di iterazioni da eseguire.
     * @param {number} [key_length=32] - La lunghezza della chiave derivata in byte.
     * @param {string} [algo='SHA-256'] - L'algoritmo di hash da usare per PBKDF2 (default 'SHA-256').
     * @returns {Promise<Uint8Array>} - La chiave derivata.
     */
    static async derive_key(password, salt, iterations = 16, key_length = 32, algo = 'SHA-256') {
        // -- converto la password in un Uint8Array
        const password_buffer = password instanceof Uint8Array ? password : new TextEncoder().encode(password);
        // -- derivo la chiave con PBKDF2
        const derived_key = await crypto.subtle.importKey(
            'raw',
            password_buffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        // -- eseguo la derivazione con PBKDF2
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: { name: algo },
            },
            derived_key,
            { name: 'AES-GCM', length: key_length * 8 }, // AES key length in bits
            true,
            ['encrypt', 'decrypt']
        );
        // -- restituisco la chiave derivata come Uint8Array
        return new Uint8Array(await crypto.subtle.exportKey('raw', key));
    }
}

window.Cripto = Cripto;