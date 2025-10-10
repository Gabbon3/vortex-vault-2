import { SignJWT, jwtVerify } from "jose";

export class JWT {
    /**
     * Signs a payload and returns a JWT
     * @param {Object} payload - Data to include in the token
     * @param {CryptoKey} key - HMAC-SHA256 CryptoKey
     * @param {number} [expiresIn] - Expiration time in seconds
     * @returns {Promise<string>} The signed JWT
     */
    static async sign(payload, key, expiresIn) {
        const signJWT = new SignJWT(payload).setProtectedHeader({
            alg: "HS256",
        });

        if (expiresIn) {
            signJWT.setExpirationTime(
                Math.floor(Date.now() / 1000) + expiresIn
            );
        }

        return await signJWT.sign(key);
    }

    /**
     * Verifies a JWT and returns the validation result
     * @param {string} token - JWT to verify
     * @param {CryptoKey} key - HMAC-SHA256 CryptoKey
     * @returns {Promise<{boolean | JWTPayload}>} Verification result
     */
    static async verify(token, key) {
        try {
            const { payload } = await jwtVerify(token, key);
            return payload;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verifica solo la firma del JWT (ignora scadenza e altri claim)
     * @param {string} token - Il JWT da verificare
     * @param {CryptoKey} key - La chiave HMAC-SHA256 usata per la firma
     * @returns {Promise<object|null>} Payload se la firma è valida, altrimenti null
     */
    static async verifySignatureOnly(token, key) {
        try {
            // Disabilita la validazione di exp, nbf, ecc.
            const { payload } = await jwtVerify(token, key, {
                // jose accetta un'opzione per ignorare scadenze
                // impostando `ignoreExpiration: true`
                // ma la devi passare dentro "options" di claim validation
                // quindi usiamo una funzione di callback custom
                clockTolerance: 0, // nessuna tolleranza temporale
                // non c’è un flag diretto “ignoreExpiration”, quindi bypassiamo così:
                currentDate: new Date(0), // forza un tempo "molto prima di exp"
            });

            return payload; // Firma valida
        } catch (error) {
            if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
                console.error("❌ Firma non valida:", error.message);
            } else {
                console.error("⚠️ Errore durante la verifica:", error.message);
            }
            return null;
        }
    }
}
