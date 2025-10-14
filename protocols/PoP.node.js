import { ECDSA } from "../utils/ecdsa.js";
import { JWT } from "../utils/jwt.utils.js";
import { Config } from "../server_config.js";
import { Bytes } from "../utils/bytes.js";
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

export class PoP {
    /**
     * Genera un token di accesso per l'utente
     * @param {string} [options.uid] - UUID dell'utente
     * @param {string} [options.pub] - Chiave pubblica ECDSA del client in Esadecimale
     * @param {{}} [options.otherClaims={}] - Altre claims da aggiungere al payload
     * @param {number} [options.exp=Config.AUTH_TOKEN_EXPIRY] - Durata in secondi del token
     * @param {number} [options.chain=false] - Se true genera anche la chain
     * @param {number} [options.counter=0] - Counter iniziale per la chain
     * @returns {Object} Oggetto con il token JWT o con token JWT e chain se chain=true
     */
    async generateAccessToken(options) {
        if (!options || !options.uid || !options.pub) throw new Error("userId e publicKeyHex sono obbligatori");
        const { otherClaims = {}, exp = Config.AUTH_TOKEN_EXPIRY, counter = 0 } = options;
        const sid = options.sid ? options.sid : uuidv7();
        const jti = uuidv4();
        const payload = { sid, jti, uid: options.uid, pub: options.pub, ...otherClaims };
        const jwt = await JWT.sign({ payload, exp }, Config.JWT_SIGN_KEY);
        // --- se richiesto genero la chain
        if (options.chain) {
            const chain = await this.calculateChain(jti, counter);
            return { jwt, sid, chain };
        }
        // ---
        return { jwt, sid };
    }

    /**
     * Calcola la chain
     * @param {string} jti - UUID dell'access token
     * @param {number} counter - numero presente nell'header x-counter inviato dal client
     */
    async calculateChain(jti, counter) {
        const payload = { jti, counter };
        const chain = await JWT.sign({ payload, exp: false }, Config.JWT_SIGN_KEY);
        return chain;
    }

    /**
     * Verifica e calcola chain successiva
     * @param {string} chain 
     * @param {string} jti 
     * @param {number} counter 
     * @returns {string | boolean} nuova chain o false se non valida
     */
    async verifyChain(chain, jti, counter) {
        const payload = await JWT.verify(chain, Config.JWT_SIGN_KEY, { ignoreExpiration: true });
        if (!payload) return false;
        // -- verifico che il jti corrisponda
        if (payload.jti !== jti) return false;
        // -- se counter inviato è minore o uguale -> attacco replay o attacco cross-site
        if (counter <= payload.counter) return false;
        // -- calcolo la nuova chain
        const newChain = await this.calculateChain(jti, counter);
        return newChain;
    }

    /**
     * Verifica se un nonce è stato firmato correttamente con la chiave pubblica
     * @param {string} nonce 
     * @param {string} signedNonceHex 
     * @param {string} publicKeyB64 
     * @returns {Promise<boolean>}
     */
    async verifyNonceSignature(nonce, signedNonceHex, publicKeyB64) {
        const publicKeyBuffer = Bytes.base64.decode(publicKeyB64, true).buffer;
        const publicKey = await ECDSA.importPublicKeyRaw(publicKeyBuffer);  
        const signedNonceBuffer = Bytes.hex.decode(signedNonceHex).buffer;
        return await ECDSA.verify(publicKey, signedNonceBuffer, Bytes.hex.decode(nonce).buffer);
    }
}