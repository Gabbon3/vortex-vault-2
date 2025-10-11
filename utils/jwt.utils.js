import { Cripto } from "./cryptoUtils.js";
import msgpack from "../docs/utils/msgpack.min.js";
import { Bytes } from "./bytes.js";

export class JWT {
    /**
     * Signs a payload and returns a JWT
     * @param {{}} options
     * @param {Object} [options.payload] - Data to include in the token
     * @param {number} [options.exp] - Expiration time in seconds
     * @param {CryptoKey} key - HMAC-SHA256 CryptoKey
     * @returns {Promise<string>} The signed JWT
     */
    static async sign(options, key) {
        let { payload = {}, exp = 900 } = options;
        // ---
        const iat = Date.now();
        if (exp) {
            exp = iat + exp * 1000;
            payload = { ...payload, iat, exp };
        }
        // ---
        const payloadBuffer = msgpack.encode(payload);
        const cripto = new Cripto();
        const signature = await cripto.hmac(
            payloadBuffer, 
            key
        );
        // ---
        const jwt =
            Bytes.base64.encode(payloadBuffer, true) +
            "." +
            Bytes.base64.encode(signature, true);
        return jwt;
    }

    /**
     * Verifies a JWT and returns the validation result
     * @param {string} jwt - JWT to verify
     * @param {CryptoKey} key - HMAC-SHA256 CryptoKey
     * @param {boolean} [options.ignoreExpiration=false] - Whether to ignore token expiration
     * @returns {Promise<{boolean | Object}>} Payload if valid, false if invalid
     */
    static async verify(jwt, key, options = {}) {
        const { ignoreExpiration = false } = options;
        try {
            const [payloadB64, signatureB64] = jwt.split(".");
            if (!payloadB64 || !signatureB64) return false;
            const payloadBuffer = Bytes.base64.decode(payloadB64, true);
            const signature = Bytes.base64.decode(signatureB64, true);
            const cripto = new Cripto();
            const expectedSignature = await cripto.hmac(
                payloadBuffer,
                key
            );
            // Confronta le firme
            if (!Bytes.compare(signature, expectedSignature)) return false;
            // Decodifica il payload
            const payload = msgpack.decode(payloadBuffer);
            // Verifico exp
            if (!ignoreExpiration) {
                const now = Date.now();
                if (payload.exp && now > payload.exp) {
                    return false;
                }
            }
            return payload;
        } catch (error) {
            return false;
        }
    }
}
