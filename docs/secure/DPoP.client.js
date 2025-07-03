import { ECDSA } from "./ecdsa.js";

export class DPoP {
    /**
     * Genera un token DPoP conforme a RFC 9449
     * @param {CryptoKey} privateKey - Chiave privata per la firma
     * @param {CryptoKey} publicKey - Chiave pubblica corrispondente
     * @param {string} htm - Metodo HTTP (es. "GET", "POST")
     * @param {string} htu - URL completo della risorsa
     * @param {Object} [options] - Opzioni aggiuntive
     * @param {string} [options.nonce] - Nonce opzionale
     * @param {string} [options.alg] - Algoritmo utilizzato (es. "ES256", "ES384", "ES512")
     * @param {number} [options.iatSkew=0] - Skew temporale in secondi (default 0)
     * @param {number} [options.expiresIn] - Durata validità in secondi
     * @param {Object} [options.additionalClaims] - Claim aggiuntivi
     * @returns {Promise<string>} Token DPoP firmato
     * @throws {Error} Se i parametri non sono validi
     */
    static async createProof(privateKey, publicKey, htm, htu, options = {}) {
        if (!htm || !htu) {
            throw new Error("htm and htu are required");
        }
        // 1. Preparazione header JWT
        const header = {
            typ: "dpop+jwt",
            alg: options.alg || "ES256",
            jwk: await this.#getSanitizedJWK(publicKey)
        };
        // 2. Preparazione payload
        const payload = {
            htm: htm.toUpperCase(),
            htu: this.#normalizeUrl(htu),
            iat: Math.floor(Date.now() / 1000) - (options.iatSkew || 0),
            ...options.additionalClaims
        };
        // -- gestione claim opzionali
        if (options.nonce) payload.nonce = options.nonce;
        if (options.expiresIn) payload.exp = payload.iat + options.expiresIn;
        // 3. Codifica e firma
        const [encodedHeader, encodedPayload] = this.#encodeJwtParts(header, payload);
        const signingInput = `${encodedHeader}.${encodedPayload}`;
        // ---
        const signature = await new ECDSA().sign(
            privateKey,
            new TextEncoder().encode(signingInput)
        );
        // ---
        return `${signingInput}.${this.#base64UrlEncode(signature)}`;
    }

    /**
     * Genera JWK pulito (rimuove campi sensibili)
     * @private
     */
    static async #getSanitizedJWK(publicKey) {
        const jwk = await new ECDSA().exportPublicKeyToJWK(publicKey);
        // Rimuove campi non necessari per DPoP
        const { key_ops, ext, ...cleanJwk } = jwk;
        return cleanJwk;
    }

    /**
     * Normalizza l'URL secondo specifica DPoP
     * @private
     */
    static #normalizeUrl(url) {
        try {
            const u = new URL(url);
            u.hash = "";
            u.searchParams.sort(); // Ordina query params
            return u.toString();
        } catch (e) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }

    /**
     * Codifica parti JWT in Base64URL
     * @private
     */
    static #encodeJwtParts(header, payload) {
        return [
            this.#base64UrlEncode(JSON.stringify(header)),
            this.#base64UrlEncode(JSON.stringify(payload))
        ];
    }

    /**
     * Codifica in Base64URL
     * @private
     */
    static #base64UrlEncode(data) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        return btoa(String.fromCharCode(...new Uint8Array(data)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}

window.DPoP = DPoP;