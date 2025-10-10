import crypto from "crypto";

export class ECDSA {
    static algorithm = {
        name: 'ECDSA',
        namedCurve: 'P-256'
    };
    static signAlgorithm = {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
    };

    /**
     * Genera una coppia di chiavi ECDSA
     * @param {boolean} [exportable=true] - Se true, le chiavi saranno esportabili
     * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
     */
    static async generateKeys(exportable = true) {
        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: ECDSA.algorithm.name,
                    namedCurve: ECDSA.algorithm.namedCurve
                },
                exportable,
                ['sign', 'verify'] // key usages
            );

            return {
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            };
        } catch (error) {
            throw new Error(`Errore nella generazione delle chiavi: ${error.message}`);
        }
    }

    /**
     * Firma un messaggio con la chiave privata
     * @param {CryptoKey} privateKey - Chiave privata per firmare
     * @param {ArrayBuffer} message - Messaggio da firmare
     * @returns {Promise<ArrayBuffer>} Firma in formato raw
     */
    static async sign(privateKey, message) {
        try {
            const signature = await crypto.subtle.sign(
                {
                    name: ECDSA.algorithm.name,
                    hash: { name: ECDSA.signAlgorithm.hash.name }
                },
                privateKey,
                message
            );

            return signature;
        } catch (error) {
            throw new Error(`Errore nella firma: ${error.message}`);
        }
    }

    /**
     * Verifica una firma con la chiave pubblica
     * @param {CryptoKey} publicKey - Chiave pubblica per verificare
     * @param {ArrayBuffer} signature - Firma da verificare
     * @param {ArrayBuffer} message - Messaggio originale
     * @returns {Promise<boolean>} True se la firma è valida
     */
    static async verify(publicKey, signature, message) {
        try {
            const isValid = await crypto.subtle.verify(
                {
                    name: ECDSA.algorithm.name,
                    hash: { name: ECDSA.signAlgorithm.hash.name }
                },
                publicKey,
                signature,
                message
            );

            return isValid;
        } catch (error) {
            throw new Error(`Errore nella verifica: ${error.message}`);
        }
    }

    /**
     * Esporta una chiave pubblica in formato raw
     * @param {CryptoKey} publicKey - Chiave pubblica da esportare
     * @returns {Promise<ArrayBuffer>} Chiave pubblica in formato raw
     */
    static async exportPublicKeyRaw(publicKey) {
        try {
            const rawKey = await crypto.subtle.exportKey(
                'raw',
                publicKey
            );
            return rawKey;
        } catch (error) {
            throw new Error(`Errore nell'esportazione della chiave pubblica: ${error.message}`);
        }
    }

    /**
     * Esporta una chiave privata in formato raw
     * @param {CryptoKey} privateKey - Chiave privata da esportare
     * @returns {Promise<ArrayBuffer>} Chiave privata in formato raw
     */
    static async exportPrivateKeyRaw(privateKey) {
        try {
            const rawKey = await crypto.subtle.exportKey(
                'pkcs8',
                privateKey
            );
            return rawKey;
        } catch (error) {
            throw new Error(`Errore nell'esportazione della chiave privata: ${error.message}`);
        }
    }

    /**
     * Importa una chiave pubblica da formato raw
     * @param {ArrayBuffer} rawPublicKey - Chiave pubblica in formato raw
     * @returns {Promise<CryptoKey>} Chiave pubblica come CryptoKey
     */
    static async importPublicKeyRaw(rawPublicKey) {
        try {
            const publicKey = await crypto.subtle.importKey(
                'raw',
                rawPublicKey,
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256'
                },
                true,
                ['verify']
            );
            return publicKey;
        } catch (error) {
            throw new Error(`Errore nell'importazione della chiave pubblica: ${error.message}`);
        }
    }

    /**
     * Importa una chiave privata da formato PKCS8
     * @param {ArrayBuffer} rawPrivateKey - Chiave privata in formato PKCS8
     * @returns {Promise<CryptoKey>} Chiave privata come CryptoKey
     */
    static async importPrivateKeyRaw(rawPrivateKey) {
        try {
            const privateKey = await crypto.subtle.importKey(
                'pkcs8',
                rawPrivateKey,
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256'
                },
                true,
                ['sign']
            );
            return privateKey;
        } catch (error) {
            throw new Error(`Errore nell'importazione della chiave privata: ${error.message}`);
        }
    }
}