import { ECDSA } from "../utils/ecdsa.js";
import { RedisDB } from "../config/redisdb.js";
import { JWT } from "../utils/jwt.utils.js";
import { Config } from "../server_config.js";
import { Bytes } from "../utils/bytes.js";

export class PoP {
    /**
     * Genera un token di accesso per l'utente
     * @param {string} userId 
     * @param {string} publicKeyHex 
     * @param {{}} [otherClaims={}] - Altre claims da aggiungere al payload
     * @param {number} [lifetime=Config.AUTH_TOKEN_EXPIRY] - Durata in secondi del token
     * @returns {string}
     */
    async generateAccessToken(userId, publicKeyHex, otherClaims = {}, lifetime = Config.AUTH_TOKEN_EXPIRY) {
        const payload = { uid: userId, pub: publicKeyHex, ...otherClaims };
        const jwt = await JWT.sign(payload, Config.JWT_SIGN_KEY, lifetime);
        return jwt;
    }

    /**
     * Verifica se un nonce è stato firmato correttamente con la chiave pubblica
     * @param {string} nonce 
     * @param {string} signedNonceHex 
     * @param {string} publicKeyHex 
     * @returns {Promise<boolean>}
     */
    async verifyNonceSignature(nonce, signedNonceHex, publicKeyHex) {
        const publicKeyBuffer = Bytes.hex.decode(publicKeyHex).buffer;
        const publicKey = await ECDSA.importPublicKeyRaw(publicKeyBuffer);  
        const signedNonceBuffer = Bytes.hex.decode(signedNonceHex).buffer;
        return await ECDSA.verify(publicKey, signedNonceBuffer, Bytes.hex.decode(nonce).buffer);
    }
}