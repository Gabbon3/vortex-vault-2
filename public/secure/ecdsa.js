/**
 * Classe per implementare l'algoritmo ECDSA (Elliptic Curve Digital Signature Algorithm) utilizzando la Web Crypto API.
 */
export class ECDSA {
    /**
     * Genera una coppia di chiavi per la firma ECDSA.
     * 
     * @returns {Promise<{public_key: Uint8Array, private_key: CryptoKey}>} La chiave pubblica in formato Uint8Array e la chiave privata in formato CryptoKey.
     */
    static async generate_keys() {
        // Genera la coppia di chiavi ECDSA usando la curva P-256
        const key_pair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256", // Puoi usare P-384 o P-521, ma P-256 è il più comune
            },
            true, // La chiave è esportabile
            ["sign", "verify"]
        );

        // Esporta la chiave pubblica in formato SPKI
        const exported_public_key = await window.crypto.subtle.exportKey("spki", key_pair.publicKey);

        // Restituisce la chiave pubblica come Uint8Array e la chiave privata come CryptoKey
        return {
            public_key: new Uint8Array(exported_public_key),
            private_key: key_pair.privateKey,
        };
    }

    /**
     * Importa una chiave pubblica ECDSA da un array di byte in formato SPKI.
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
                name: "ECDSA",
                namedCurve: "P-256", // La curva deve essere la stessa
            },
            true, // La chiave è esportabile
            ["verify"] // La chiave è usata solo per la verifica
        );
    }

    /**
     * Firma un messaggio utilizzando la chiave privata ECDSA.
     * 
     * @param {CryptoKey} private_key - La chiave privata in formato CryptoKey.
     * @param {Uint8Array} message - Il messaggio da firmare come Uint8Array.
     * @returns {Promise<Uint8Array>} La firma digitale del messaggio.
     */
    static async sign_message(private_key, message) {
        // Firma il messaggio con la chiave privata
        const signature = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" },  // L'algoritmo di hashing usato per la firma
            },
            private_key,  // La chiave privata usata per firmare
            message  // Il messaggio da firmare
        );

        // Restituisce la firma come Uint8Array
        return new Uint8Array(signature);
    }

    /**
     * Verifica la firma di un messaggio utilizzando la chiave pubblica ECDSA.
     * 
     * @param {CryptoKey} public_key - La chiave pubblica in formato CryptoKey.
     * @param {Uint8Array} signature - La firma del messaggio da verificare.
     * @param {Uint8Array} message - Il messaggio originale da verificare.
     * @returns {Promise<boolean>} True se la firma è valida, altrimenti false.
     */
    static async verify_signature(public_key, signature, message) {
        // Verifica la firma con la chiave pubblica
        const isValid = await window.crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" },  // L'algoritmo di hashing usato per la verifica
            },
            public_key,  // La chiave pubblica usata per verificare
            signature,  // La firma da verificare
            message  // Il messaggio firmato
        );

        // Restituisce true se la firma è valida, altrimenti false
        return isValid;
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
     * Converte una chiave privata in formato Uint8Array in un CryptoKey per uso con ECDSA.
     * 
     * @param {Uint8Array} private_key_bytes - La chiave privata in formato Uint8Array.
     * @returns {Promise<CryptoKey>} La chiave privata importata come CryptoKey.
     */
    static async import_private_key(private_key_bytes) {
        return window.crypto.subtle.importKey(
            "pkcs8", // Tipo di chiave
            private_key_bytes, // Chiave privata come Uint8Array
            {
                name: "ECDSA",
                namedCurve: "P-256", // La curva deve corrispondere a quella utilizzata per la generazione
            },
            true, // La chiave è esportabile
            ["sign"] // Operazioni consentite (solo firma)
        );
    }
}