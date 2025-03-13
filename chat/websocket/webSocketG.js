import { v4 as uuidv4 } from "uuid";
import msgpack from "../../public/utils/msgpack.min.js";
import { AES256GCM } from "../../utils/aesgcm.js";

export const webSocketG = (ws) => {
    Object.assign(ws, {
        uuid: uuidv4(),
        // -- questo parametro servirà a indicare se un web socket è stato verificato
        // - per abilitare la connessione va quindi verificato un access token
        connectionVerified: false,
        secret: null,
        /**
         * Metodo personalizzato per comunicare in maniera protetta
         * crittografando i dati in uscita con la chiave segreta condivisa del web socket
         * @param {*} data
         */
        sendE(data) {
            const encodedData = msgpack.encode(data);
            const encryptedData = AES256GCM.encrypt(encodedData, this.secret);
            this.send(encryptedData.buffer);
        },
        /**
         * Metodo personalizzato per:
         * - chiudere la connessione con il client
         * - inviare un messaggio con la motivazione della chiusura
         * @param {number} code - codice di errore (usare i codici http)
         * @param {string} error - messaggio di errore
         */
        closeWithError(code, error) {
            this.send(JSON.stringify({ code, error }));
            this.close();
        }
    });

    return ws;
}