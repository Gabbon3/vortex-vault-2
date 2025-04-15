import { RocksCRUD } from "../utils/rocksCRUD.js";

export class RocksManager {
    /**
     * Crea un'istanza di MessageService.
     * @param {RocksCRUD} db
     */
    constructor(db) {
        this.db = db;
    }
    /**
     * Inserisce un dato in un recipiente in RocksDB.
     * @param {string} recipientID - id della coda di destinazione
     * @param {*} data - Contenuto del messaggio che verrà codificato con msgpack
     * @returns {boolean}
     */
    insert = async (recipientID, data) => {
        // -- ottengo l'indice corrente
        const index = await this.getRecipientSize(recipientID);
        // ---
        const key = `${recipientID}:${index}`;
        const saved = this.db.put(key, data);
        // -- aggiorno il count
        if (!saved) return false;
        await this.db.put(`${recipientID}:size`, index + 1);
        // ---
        return true;
    };
    /**
     * Estrae e restituisce tutti i dati presenti in un recipiente.
     * @param {string} recipientID - id del recipiente.
     * @param {number} recipientSize - dimensione del recipiente, cioè quante volte iterare sul db
     * @param {boolean} [destroy=true] - se true, dopo la lettura di ogni elemento del recipiente, questo verrà eliminato
     * @returns {Promise<Array|boolean>} - Array di dati del recipiente, dal pi vecchio al piu recente
     */
    async extract(recipientID, recipientSize, destroy = true) {
        const recipient = [];
        try {
            for (let i = 0; i < recipientSize; i++) {
                const key = `${recipientID}:${i}`;
                const element = await this.db.get(key);
                if (element) {
                    recipient.push(element);
                    // -- elimino il dato se richiesto, dopo essere stato recuperato
                    if (destroy) await this.db.del(key);
                }
            }
            // -- resetto a 0 la dimensione del recipiente
            const recipientCountID = `${recipientID}:size`;
            // -- resetto la dimensione se ho eliminato il contenuto del recipiente
            if (destroy) await this.db.put(recipientCountID, 0);
            return recipient;
        } catch (error) {
            console.error(`Errore nel recupero dei messaggi per ${recipientID}: ${error}`);
            return false;
        }
    }
    /**
     * Ottiene l'ultimo indice utilizzato per memorizzare un messaggio
     *
     * @param {string} recipientID - id del recipiente
     * @returns {number} - Numero di messaggi pendenti
     */
    getRecipientSize = async (recipientID) => {
        const key = `${recipientID}:size`;
        const size = await this.db.get(key);
        return size === null || size === undefined ? 0 : size;
    };

    /**
     * Svuota i recipienti inviando i dati via websocket.
     * @param {Object} ws - La connessione WebSocket.
     * @param {string} recipientID - ID del recipiente.
     */
    emptyRecipient = async (ws, recipientID) => {
        try {
            // -- ottengo il numero di dati presenti in un recipiente
            const recipientSize = await this.getRecipientSize(recipientID);
            // -- se il recipiente  è vuoto
            if (recipientSize === 0) return;
            // --
            const data = await this.extract(recipientID, recipientSize, true);
            if (data.length === 0) return;
            // ---
            for (const element of data) {
                ws.sendE(element);
            }
        } catch (error) {
            console.error(`Errore nell'invio dei messaggi pendenti per ${recipientID}: ${error}`);
        }
    };
}
