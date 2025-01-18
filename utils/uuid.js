import crypto from "crypto";

/**
 * Classe per la generazione di UUID personalizzati.
 * Rappresenta la versione 7 di UUID con modifiche personalizzate.
 */
export class UUID {
    // -- funzione per ottenere i byte casuali
    static get_random_bytes(n) {
        const random_bytes = crypto.randomBytes(n);
        return random_bytes;
    }

    // -- funzione per ottenere il timestamp in formato adatto
    static get_timestamp() {
        const nano = (process.hrtime.bigint() / 100n) % 1_000_000n;
        const mill = BigInt(Date.now());
        let timestamp = mill * 1_000_000n + nano;
        // ---
        const buffer = Buffer.alloc(8);
        for (let i = 7; i >= 0; i--) {
            buffer[i] = Number(timestamp & 0xffn);
            timestamp >>= 8n;
        }
        // ---
        return buffer;
    }

    // -- funzione per generare l'uuid v7
    static uuid_v7() {
        // -- prendo il timestamp e i byte casuali
        const timestamp = UUID.get_timestamp();
        const random_bytes = UUID.get_random_bytes(8);
        // -- imposto la versione nei primi 4 bit del 7 byte (indice 6)
        timestamp[6] &= 0x0f; // pulisco i primi 4 bit
        timestamp[6] |= 0x70; // imposto la versione
        // -- imposto la variante N (2 bit) nel primo byte dei random_bytes
        random_bytes[0] |= 0b10; // imposto i primi due bit a 10 (per la variante N)
        // -- unisco i byte del timestamp e dei byte casuali
        const uuid_bytes = Buffer.concat([timestamp, random_bytes]);
        // -- converto i byte in formato stringa UUID standard
        let uuid_string = "";
        uuid_bytes.forEach((byte, i) => {
            if ([3, 5, 7, 9].includes(i)) {
                uuid_string += byte.toString(16).padStart(2, "0") + "-";
            } else {
                uuid_string += byte.toString(16).padStart(2, "0");
            }
        });

        // -- rimuovo l'ultimo trattino e restituisco il risultato
        return uuid_string;
    }
}