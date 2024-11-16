import { Cripto } from "./cryptoUtils.js";

export class TOTP {
    /**
     * Genera un codice da un segreto
     * @param {Uint8Array} secret 
     * @param {number} [interval=30] 
     * @param {number} [shift=0] indice per calcolare segreti di altri momenti nel tempo
     * @returns 
     */
    static async code(secret, interval = 30, shift = 0) {
        // -- ottengo il timestamp corrente diviso l'intervallo
        let time = Math.floor(((Date.now() / 1000) + (shift * interval)) / interval);
        // -- converto il timestamp in binario (8 byte BigEndian)
        const time_bytes = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
            // -- ottengo man mano ogni byte eseguendo la AND con 255 (0xff) partendo dal fondo
            time_bytes[i] = time & 0xff;
            // -- shifto di 8 posizioni a destra per ottenere i successivi 8 bit
            time >>= 8;
        }
        // -- calcolo l'hmac con SHA-1
        const hmac = await Cripto.hmac(time_bytes, secret, {
            algo: "sha1"
        });
        /* -- estraggo l'offset (deve essere compreso tra 0 e 15)
         * -- eseguendo & 0xf mi assicuro che il valore sia compreso tra 0 e 15
         * -- poiche dovrò prendere, partendo dall offset, 4 byte successivi
         */
        const offset = hmac[19] & 0xf;
        // -- combino i 4 byte per generare un numero a 31 bit
        // -- il 32 viene scartato in questo modo ottengo un numero positivo
        const code = (
            ((hmac[offset] & 0x7f) << 24) | // ottengo i 7 bit piu significativi
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            ((hmac[offset + 3] & 0xff))
        ) % 1000000;
        // -- restituisco il codice con eventuale padding a sinistra con 0
        return code.toString().padStart(6, '0');
    }
    /**
     * Verifica se un codice totp è corretto
     * @param {string} code 
     * @param {Uint8Array} secret 
     */
    static async verify(code, secret) {
        const codes = [
            await this.code(secret, 30, -1),
            await this.code(secret, 30, 0),
            await this.code(secret, 30, 1),
        ];
        return codes.includes(code);
    }
}