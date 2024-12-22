import { BaseConverter } from "./baseConverter.js";
import { RandomUtils } from "./random.js";

export class UID {
    static base = 62;
    /**
     * Genera i prefissi c1 e c2 da usare nella generazione dell uid
     * @param {number} size dimensione in byte del numero casuale finale
     * @returns {string} - numero casuale in formato base 36
     */
    static random_c(size) {
        const random_number = RandomUtils.high_entropy(size);
        // ---
        return BaseConverter.to_string(Number(random_number), this.base);
    }

    static generate(byte_size) {
        return this.v2(byte_size);
    }
    /**
     * Genera un identificatore unico con formato c1-t-n-c2
     * dove 'c1' e 'c2' sono le parti casuali, 't' è il tempo in ms e 'n' sono i nanosecondi che aggiungono entropia e univocità
     * il generatore lavora con numeri in base 62
     * @param {number} [byte_size=3] - Dimensione in byte delle parti casuali c1 e c2
     * @param {boolean} [better_entropy=false] - aggiunge i microsecondi
     * @returns {string} - l'identificatore univoco
     */
    static v1(byte_size = 4, better_entropy = false) {
        if (byte_size < 2 || byte_size > 12)
            throw new Error(
                "Dimensione parti casuali non valida (2 <= byte_size <= 12)"
            );
        // ---
        const timestamp = BaseConverter.to_string(Date.now(), this.base);
        // ---
        const c1 = this.random_c(byte_size);
        const c2 = this.random_c(byte_size);
        // -- calcolo i microsecondi del secondo corrente e li converto in una stringa base 62
        const microseconds = BaseConverter.to_string(
            Math.floor(process.hrtime()[1] / 1000),
            62
        ).padStart(4, "0");
        // ---
        return `${c1}-${timestamp}-${
            better_entropy ? microseconds + "-" : ""
        }${c2}`;
    }
    /**
     * Versione 2 che genera un UID composto da
     * timestamp-nanoseconds-bytesCasuali
     * @param {number} byte_size
     * @returns {string} xxxxxxx-xxxx-xxxxxxxxxx
     */
    static v2(byte_size = 6) {
        // -- timestamp
        const timestamp = BaseConverter.to_string(Date.now(), this.base);
        // -- seconds
        const seconds = BaseConverter.to_string(
            process.hrtime()[0],
            this.base
        );
        // -- nanoseconds
        const nanoseconds = BaseConverter.to_string(
            process.hrtime()[1],
            this.base
        )
        // -- random
        const random = this.random_c(byte_size);
        // ---
        return `${timestamp}-${seconds}-${nanoseconds}-${random}`;
    }

    static test(L) {
        const u = new Set();
        for (let i = 0; i < L; i++) {
            const uid = UID.generate();
            if (u.has(uid)) throw new Error("Duplication detected");
            u.add(uid);
        }
        console.log(u);
        return true;
    }
}
