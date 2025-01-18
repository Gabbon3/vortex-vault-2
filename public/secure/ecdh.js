/**
 * Classe per implementare l'algoritmo ECDH (Elliptic Curve Diffie-Hellman) utilizzando la Web Crypto API.
 */
export class ECDH {
    /**
     * Genera una coppia di chiavi pubblica e privata ECDH.
     * 
     * @returns {Promise<{public_key: Uint8Array, private_key: CryptoKey}>} La chiave pubblica in formato Uint8Array e la chiave privata in formato CryptoKey.
     */
    static async generate_keys() {
        // Genera la coppia di chiavi ECDH usando la curva P-256
        const key_pair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256", // Puoi usare P-384 o P-521, ma P-256 è il più comune
            },
            true, // La chiave è esportabile
            ["deriveKey", "deriveBits"]
        );

        // Esporta le chiavi
        const exported_public_key = await window.crypto.subtle.exportKey("spki", key_pair.publicKey);
        const exported_private_key = await window.crypto.subtle.exportKey("pkcs8", key_pair.privateKey);

        // restituisco le chiavi
        return {
            public_key: key_pair.publicKey,
            private_key: key_pair.privateKey,
            exported_keys: {
                public_key: new Uint8Array(exported_public_key),
                private_key: new Uint8Array(exported_private_key),
            }
        };
    }

    /**
     * Importa una chiave pubblica ECDH da un array di byte in formato SPKI.
     * 
     * @param {Uint8Array} public_key - La chiave pubblica in formato Uint8Array.
     * @returns {Promise<CryptoKey>} La chiave pubblica importata come CryptoKey.
     */
    static async import_public_key(public_key) {
        // Importa la chiave pubblica ricevuta in formato SPKI
        return window.crypto.subtle.importKey(
            "spki", // Formato della chiave
            public_key, // La chiave pubblica in formato Uint8Array
            {
                name: "ECDH",
                namedCurve: "P-256", // La curva deve essere la stessa
            },
            true, // La chiave è esportabile
            [] // Le operazioni consentite (vuoto perché la chiave è solo per derivare)
        );
    }

    /**
     * Deriva una chiave condivisa utilizzando una chiave privata e una chiave pubblica.
     * 
     * @param {CryptoKey} private_key - La chiave privata in formato CryptoKey.
     * @param {CryptoKey} public_key - La chiave pubblica in formato CryptoKey.
     * @returns {Promise<Uint8Array>} La chiave condivisa derivata come Uint8Array.
     */
    static async derive_shared_secret(private_key, public_key) {
        // Deriva la chiave condivisa utilizzando la chiave privata e la chiave pubblica
        const shared_secret = await window.crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: public_key, // La chiave pubblica
            },
            private_key, // La chiave privata
            256 // La lunghezza della chiave condivisa in bit (può essere 256, 384, 521)
        );
        // Restituisce la chiave condivisa come Uint8Array
        return new Uint8Array(shared_secret);
    }

    /**
     * Esporta una chiave privata in formato PKCS#8.
     * 
     * @param {CryptoKey} private_key - La chiave privata in formato CryptoKey.
     * @returns {Promise<Uint8Array>} La chiave privata esportata come Uint8Array.
     */
    static async export_private_key(private_key) {
        const exported_private_key = await window.crypto.subtle.exportKey("pkcs8", private_key);
        return new Uint8Array(exported_private_key);
    }

    /**
     * Converte una chiave privata in formato Uint8Array in un CryptoKey per uso con ECDH.
     * 
     * @param {Uint8Array} private_key_bytes - La chiave privata in formato Uint8Array.
     * @returns {Promise<CryptoKey>} La chiave privata importata come CryptoKey.
     */
    static async import_private_key(private_key_bytes) {
        return window.crypto.subtle.importKey(
            "pkcs8", // Tipo di chiave
            private_key_bytes, // Chiave privata come Uint8Array
            {
                name: "ECDH",
                namedCurve: "P-256", // La curva deve corrispondere a quella utilizzata per la generazione
            },
            true, // La chiave è esportabile
            ["deriveKey", "deriveBits"] // Operazioni consentite (nessuna)
        );
    }
}