import { Cripto } from "./cryptoUtils.js";

export class RandomUtils {
    /**
     * Genera un numero casuale crittograficamente sicuro partendo da una serie di byte casuali
     * @param {number} size in byte
     * @returns {BigInt}
     */
    static high_entropy(size) {
        const cripto = new Cripto();
        const random_bytes = cripto.randomBytes(size);
        // ---
        let random_number = 0n;
        for (let i = 0n; i < size; i++) {
            random_number |= BigInt(random_bytes[i]) << i * 8n;
        }
        // ---
        return random_number;
    }
}