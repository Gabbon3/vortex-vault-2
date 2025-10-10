import { ECDSA } from "./ecdsa.js";
import { Bytes } from "../utils/bytes.js";
import { API } from "../utils/api.js";
import { SessionStorage } from "../utils/session.js";

// PoP.js Proof of Possession
export class PoP {
    static keys = {};
    /**
     * Inizializzo PoP caricando la chiave privata dalla sessione o generandone una nuova
     * @returns {Promise<boolean>}
     */
    static async init() {
        const privateKeyHex = SessionStorage.get('pop-private-key');
        if (!privateKeyHex) return false;
        const privateKeyBuffer = Bytes.hex.decode(privateKeyHex).buffer;
        PoP.keys.privateKey = await ECDSA.importPrivateKeyRaw(privateKeyBuffer, false);
        return true; 
    }
    /**
     * Genera la coppia di chiavi ECDSA per il PoP
     * @returns {Promise<string>} chiave pubblica in hex
     */
    static async generateKeyPair() {
        const keys = await ECDSA.generateKeys(true);
        PoP.keys.publicKey = keys.publicKey;
        PoP.keys.privateKey = keys.privateKey;
        // -- esporto la chiave pubblica
        const exportedPublicKey = await ECDSA.exportPublicKeyRaw(
            PoP.keys.publicKey
        );
        const exportedPrivateKey = await ECDSA.exportPrivateKeyRaw(
            PoP.keys.privateKey
        );
        PoP.keys.privateKey = ECDSA.importPrivateKeyRaw(exportedPrivateKey, false);
        SessionStorage.set('pop-private-key', Bytes.hex.encode(new Uint8Array(exportedPrivateKey)));
        return Bytes.hex.encode(new Uint8Array(exportedPublicKey));
    }

    /**
     * Rigenera l'access token firmando un nonce
     * @returns {Promise<boolean>} true se riuscito, false se fallito
     */
    static async refreshAccessToken() {
        // rigenero il token quindi chiedo un nonce dal server
        const nonceRes = await API.call("/auth/nonce", { method: "GET" });
        if (!nonceRes || !nonceRes.nonce) return null;
        const nonceBuffer = Bytes.hex.decode(nonceRes.nonce).buffer;
        // -- firmo il nonce con POP
        const signedNonce = await ECDSA.sign(this.keys.privateKey, nonceBuffer);
        const signedNonceHex = Bytes.hex.encode(new Uint8Array(signedNonce));
        // -- chiamo l'endpoint di refresh con il nonce firmato
        const refreshRes = await API.call('/auth/refresh', {
            method: 'POST',
            body: { signedNonce: signedNonceHex, nonce: nonceRes.nonce }
        });
        if (!refreshRes) return false;
        // ---
        SessionStorage.set('access-token-expiry', new Date(Date.now() + (15 * 60 * 1000)));
        return true;
    }
}

window.PoP = PoP;