import msgpack from "../utils/msgpack.min.js";

/**
 * Classe statica per la cifratura e decifratura dei dati usando AES-256-GCM con le Web Crypto API.
 */
export class AES256GCM {
    // mappa per gestire la configurazione delle versioni
    static versionMap = {
        1: {
            nonceLength: 12,
            tagLength: 128, // bit
            algorithm: 'AES-GCM',
        }
    }
    // mappa di supporto per riutilizzare le stesse crypto key
    static keyMap = new Map();
    /**
     * Importa una chiave AES-256-GCM da un buffer, se necessario.
     * Se riceve già una CryptoKey, la restituisce direttamente.
     *
     * @param {Uint8Array|CryptoKey} inputKey
     * @param {number} [version=1] versione utilizzata per la cifratura
     * @returns {Promise<CryptoKey>}
     */
    static async resolveKey(inputKey, version = 1) {
        if (inputKey instanceof CryptoKey) return inputKey;
        if (inputKey instanceof Uint8Array && inputKey.length === 32) {
            // -- verifico se la chiave non è in cache
            const cacheKey = [...inputKey].join("");
            if (this.keyMap.has(cacheKey)) return this.keyMap.get(cacheKey);
            // -- se non lo è importo la cripto key e metto in cache
            const key = await crypto.subtle.importKey(
                "raw",
                inputKey,
                { name: this.versionMap[version].algorithm },
                false,
                ["encrypt", "decrypt"]
            );
            this.keyMap.set(cacheKey, key);
            return key;
        }
        throw new Error(
            "Formato chiave non valido, erano attesi 32 byte o una CryptoKey."
        );
    }
    /**
     * Cifra i dati utilizzando AES-256-GCM.
     *
     * @param {Uint8Array} data - I dati da cifrare.
     * @param {Uint8Array|CryptoKey} keyBuffer - La chiave di cifratura (32 byte per AES-256).
     * @param {*|Uint8Array} [aad=null] - informazioni aggiuntive da includere per l'autenticazione
     * @param {number} [version=1] - indica con quale versione i dati sono cifrati
     * @returns {Promise<Uint8Array>} - I dati cifrati concatenati con il nonce e il tag di autenticazione.
     */
    static async encrypt(data, keyBuffer, aad = null, version = 1) {
        // -- genero un nonce casuale
        const nonce = crypto.getRandomValues(new Uint8Array(this.versionMap[version].nonceLength));
        // -- importo la chiave
        const key = await this.resolveKey(keyBuffer);
        // ---
        const options = {
            name: this.versionMap[version].algorithm,
            iv: nonce,
            tagLength: this.versionMap[version].tagLength,
        }
        // -- normalizzo gli additional data
        const normalizedAad = this.normalizeAad(aad);
        if (normalizedAad instanceof Uint8Array) options.additionalData = normalizedAad;
        // -- cifro i dati usando AES-GCM
        const cipher = await crypto.subtle.encrypt(
            options,
            key,
            data
        );
        // -- estraggo il tag di autenticazione (ultimi 16 byte della cifratura)
        const encryptedData = new Uint8Array(cipher);
        // -- concateno nonce, dati cifrati e tag di autenticazione
        return new Uint8Array([version, ...nonce, ...encryptedData]);
    }

    /**
     * Decifra i dati con AES-256-GCM.
     *
     * @param {Uint8Array} encrypted - I dati cifrati concatenati (nonce + dati cifrati + tag).
     * @param {Uint8Array} keyBuffer - La chiave di decifratura (32 byte per AES-256).
     * @param {*|Uint8Array} [aad=null] - informazioni aggiuntive da includere per l'autenticazione
     * @returns {Promise<Uint8Array>} - I dati decifrati.
     */
    static async decrypt(encrypted, keyBuffer, aad = null) {
        // -- ottengo la versione
        const version = encrypted[0];
        // -- estraggo il nonce, i dati cifrati e il tag di autenticazione
        const nonce = encrypted.slice(1, 1 + this.versionMap[version].nonceLength);
        const encryptedData = encrypted.slice(1 + this.versionMap[version].nonceLength);
        // -- importo la chiave
        const key = await this.resolveKey(keyBuffer);
        // ---
        const options = {
            name: this.versionMap[version].algorithm,
            iv: nonce,
            tagLength: this.versionMap[version].tagLength,
        }
        // -- normalizzo gli additional data
        const normalizedAad = this.normalizeAad(aad);
        if (normalizedAad instanceof Uint8Array) options.additionalData = normalizedAad;
        // -- cifro i dati usando AES-GCM
        try {
            const decrypted = await crypto.subtle.decrypt(
                options,
                key,
                encryptedData
            );
            return new Uint8Array(decrypted);
        } catch (error) {
            throw new Error("Decryption failed: " + error.message);
        }
    }

    /**
     * Ordina e restituisce l'oggetto json, per evitare ambiguità
     * con oggetti che contengono chiavi che potrebbero essere ordinate in maniere dirrerenti
     * @param {Object} data
     * @returns {Uint8Array|null}
     */
    static normalizeAad(data) {
        return data
            ? data instanceof Uint8Array
                ? data
                : msgpack.encode(data)
            : null;
    }
}

window.AES256GCM = AES256GCM;
