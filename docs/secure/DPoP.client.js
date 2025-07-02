import { Bytes } from "../utils/bytes.js";
import { ECDSA } from "./ecdsa.js";

/**
 * Implementazione server di Dimostrazione della Prova di Possesso
 * ~ Demonstrating Proof-of-Possession
 */
export class DPoP {
    static privateKey = null;
    static publicKey = null;

    /**
     * Genera una coppia di chiavi ECDSA da usare per firmare le richieste
     * @returns {string} la chiave pubblica in formato esadecimale
     */
    static async generateKeyPair() {
        const ecdsa = new ECDSA();
        const keyPair = await ecdsa.generateKeyPair(ECDSA.curves.P256, true);
        // -- salvo temporaneamente le chiavi
        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;
        // ---
        return Bytes.hex.encode(keyPair.publicKey);
    }
}