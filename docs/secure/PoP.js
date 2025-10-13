import { ECDSA } from "./ecdsa.js";
import { Bytes } from "../utils/bytes.js";
import { API } from "../utils/api.js";
import { KeyStore } from "./keystore.js";
import { SessionStorage } from "../utils/session.js";

// PoP.js Proof of Possession
export class PoP {
    static keys = {};
    static keyStore = new KeyStore('AuthKeys');
    static dbPrivateKeyName = 'PopPrivateKey';
    /**
     * Inizializzo PoP caricando la chiave privata dalla sessione o generandone una nuova
     * @returns {Promise<boolean>}
     */
    static async init() {
        const privateKey = await this.keyStore.loadKey(this.dbPrivateKeyName);
        if (!privateKey) return false;
        // ---
        PoP.keys.privateKey = privateKey;
        return true;
    }
    /**
     * Genera la coppia di chiavi ECDSA per il PoP
     * @returns {Promise<string>} chiave pubblica in hex
     */
    static async generateKeyPair() {
        const keys = await ECDSA.generateKeys(true);
        PoP.keys.publicKey = keys.publicKey;
        const privateKey = keys.privateKey;
        // -- esporto la chiave pubblica
        const exportedPublicKey = await ECDSA.exportPublicKeyRaw(
            PoP.keys.publicKey
        );
        const exportedPrivateKey = await ECDSA.exportPrivateKeyRaw(
            privateKey
        );
        // -- salvo la chiave privata in maniera che non sia esportabile
        PoP.keys.privateKey = await ECDSA.importPrivateKeyRaw(exportedPrivateKey, false);
        // -- salvo la chiave su indexeddb
        await this.keyStore.saveKey(PoP.keys.privateKey, this.dbPrivateKeyName);
        return Bytes.hex.encode(new Uint8Array(exportedPublicKey));
    }

    /**
     * Rigenera l'access token firmando un nonce
     * @returns {Promise<boolean>} true se riuscito, false se fallito
     */
    static async refreshAccessToken() {
        // verifico che la chiave privata sia stata istanziata
        if (!this.keys.privateKey) return false;
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