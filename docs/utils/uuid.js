/**
 * Classe utility per generare UUID.
 */
export class UUID {
    /**
     * Genera un UUID versione 4.
     * @returns {string} Una stringa UUID v4.
     */
    static v4() {
        // -- Eseguo la generazione dell'UUID v4 usando crypto.getRandomValues.
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (
                c ^
                (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
            ).toString(16)
        );
    }

    /**
     * Genera un UUID versione 7.
     * @returns {string} Una stringa UUID v7.
     */
    static v7() {
        // -- Creo un array di 16 byte per memorizzare l'UUID.
        const uuid = new Uint8Array(16);
        // -- Ottengo il timestamp attuale in millisecondi come BigInt.
        const now = BigInt(Date.now());
        // -- Scrivo il timestamp (48 bit, big-endian) nei primi 6 byte usando BigInt.
        uuid[0] = Number((now >> 40n) & 0xffn);
        uuid[1] = Number((now >> 32n) & 0xffn);
        uuid[2] = Number((now >> 24n) & 0xffn);
        uuid[3] = Number((now >> 16n) & 0xffn);
        uuid[4] = Number((now >> 8n) & 0xffn);
        uuid[5] = Number(now & 0xffn);
        // -- Riempio i restanti 10 byte con dati casuali.
        crypto.getRandomValues(uuid.subarray(6));
        // -- Imposto la versione: nibble alto del byte 6 a 7 (UUID v7).
        uuid[6] = 0x70 | (uuid[6] & 0x0f);
        // -- Imposto la variante: i primi 2 bit del byte 8 a 10 (variant 1).
        uuid[8] = 0x80 | (uuid[8] & 0x3f);
        // -- Converto l'array di byte in stringa formattata come 8-4-4-4-12.
        const hex = Array.from(uuid, (b) => b.toString(16).padStart(2, "0"));
        return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
            .slice(6, 8)
            .join("")}-${hex.slice(8, 10).join("")}-${hex
            .slice(10, 16)
            .join("")}`;
    }
}