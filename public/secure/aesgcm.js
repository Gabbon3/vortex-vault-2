/**
 * Classe statica per la cifratura e decifratura dei dati usando AES-256-GCM con le Web Crypto API.
 */
export class AES256GCM {
    /**
     * Cifra i dati utilizzando AES-256-GCM.
     * 
     * @param {Uint8Array} data - I dati da cifrare.
     * @param {Uint8Array} key_buffer - La chiave di cifratura (32 byte per AES-256).
     * @returns {Promise<Uint8Array>} - I dati cifrati concatenati con il nonce e il tag di autenticazione.
     */
    static async encrypt(data, key_buffer) {
        // -- genero un nonce casuale di 12 byte
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        // -- importo la chiave
        const key = await crypto.subtle.importKey(
            "raw",
            key_buffer,
            { name: "AES-GCM" },
            false,
            ["encrypt"]
        );
        // -- cifro i dati usando AES-GCM
        const cipher = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
            },
            key,
            data
        );
        // -- estraggo il tag di autenticazione (ultimi 16 byte della cifratura)
        const encrypted_data = new Uint8Array(cipher);
        // -- concateno nonce, dati cifrati e tag di autenticazione
        return new Uint8Array([...nonce, ...encrypted_data]);
    }

    /**
     * Decifra i dati con AES-256-GCM.
     * 
     * @param {Uint8Array} encrypted - I dati cifrati concatenati (nonce + dati cifrati + tag).
     * @param {Uint8Array} key_buffer - La chiave di decifratura (32 byte per AES-256).
     * @returns {Promise<Uint8Array>} - I dati decifrati.
     */
    static async decrypt(encrypted, key_buffer) {
        // -- estraggo il nonce, i dati cifrati e il tag di autenticazione
        const nonce = encrypted.slice(0, 12);
        const encrypted_data = encrypted.slice(12);
        // -- importo la chiave
        const key = await crypto.subtle.importKey(
            "raw",
            key_buffer,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );
        // -- cifro i dati usando AES-GCM
        try {
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    tagLength: 128, // L'AES-GCM ha un tag di 128 bit (16 byte)
                },
                key,
                encrypted_data
            );
            return new Uint8Array(decrypted);
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    }
}