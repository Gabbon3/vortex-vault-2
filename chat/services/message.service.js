import { logger } from "../config/logger.js";
import { RocksCRUD } from "../utils/rocksCRUD.js";

export class MessageService {
    /**
     * Crea un'istanza di MessageService.
     * @param {RocksCRUD} db
     */
    constructor(db) {
        this.db = db;
    }
    /**
     * Salva un messaggio in RocksDB per un destinatario offline.
     * @param {string} receiver - UUID destinatario
     * @param {string} sender - UUID mittente
     * @param {string} message - Contenuto del messaggio
     */
    addMessage = async (receiver, sender, message) => {
        const count = await this.getIndex(receiver);
        const index = count;
        // ---
        const key = `msg:${receiver}:${index}`;
        const saved = this.db.put(key, [sender, message]);
        // -- aggiorno il count
        if (!saved) return false;
        await this.db.put(`${receiver}:count`, count + 1);
        // ---
        return true;
    };
    /**
     * Recupera tutti i messaggi pendenti di un determinato utente.
     *
     * @param {string} receiver - UUID dell'utente destinatario.
     * @param {number} pendingCount - Numero di messaggi da recuperare.
     * @returns {Promise<Array>} - Una promessa che restituisce un array di messaggi.
     */
    async getMessages(receiver, pendingCount) {
        const messages = [];
        try {
            for (let i = 0; i < pendingCount; i++) {
                const messageKey = `msg:${receiver}:${i}`;
                const message = await this.db.get(messageKey);
                if (message) {
                    messages.push(message);
                    // -- elimina il messaggio dopo che è stato letto
                    await this.db.del(messageKey);
                }
            }
            // -- reset del contatore dei messaggi pendenti
            const receiverCountKey = `${receiver}:count`;
            await this.db.put(receiverCountKey, 0);
            return messages;
        } catch (error) {
            logger.error(`Errore nel recupero dei messaggi per ${receiver}: ${error}`);
            return false;
        }
    }
    /**
     * Ottiene l'ultimo indice utilizzato per memorizzare un messaggio
     *
     * @param {string} uuid - UUID dell'utente destinatario
     * @returns {number} - Numero di messaggi pendenti
     */
    getIndex = async (uuid) => {
        const key = `${uuid}:count`;
        const count = await this.db.get(key);
        return count === null || count === undefined ? 0 : count;
    };

    /**
     * Invia i messaggi pendenti a un utente tramite WebSocket.
     *
     * @param {Object} ws - La connessione WebSocket dell'utente.
     * @param {string} receiverUUID - UUID dell'utente destinatario.
     * @returns {Promise<void>} - Una promessa che si risolve quando i messaggi sono stati inviati.
     */
    sendPendingMessages = async (ws, receiverUUID) => {
        try {
            // -- ottiengo il numero di messaggi pendenti per l'utente
            const pendingCount = await this.getIndex(receiverUUID);
            // -- se ci sono messaggi pendenti, li invio
            if (pendingCount > 0) {
                const messages = await this.getMessages(
                    receiverUUID,
                    pendingCount
                );
                if (messages && messages.length > 0) {
                    // -- invio i messaggi al client tramite WebSocket
                    messages.forEach(([sender, message]) => {
                        ws.send(
                            JSON.stringify({
                                type: "message",
                                sender,
                                message,
                            })
                        );
                    });
                }
            }
        } catch (error) {
            logger.error(`Errore nell'invio dei messaggi pendenti per ${receiverUUID}: ${error}`);
        }
    };
    /**
     * Gestisce la ricezione di un messaggio WebSocket.
     * @param {string} senderId - ID dell'utente mittente
     * @param {string} data - Messaggio ricevuto (JSON string)
     * @param {Map<string, WebSocket>} clients - Mappa utenti connessi
     */
    handleMessage = (sender, data, clients) => {
        const { receiver, message } = JSON.parse(data);
        // -- verifico se il destinatario è online
        // -- se è online, invio il messaggio
        // -- altrimenti, salvo il messaggio in RocksDB per poi inviarlo quando il destinatario riconoscerà la connessione
        if (clients.has(receiver)) {
            clients.get(receiver).send(JSON.stringify([sender, message]));
        } else {
            this.addMessage(receiver, sender, message);
        }
    };
}
