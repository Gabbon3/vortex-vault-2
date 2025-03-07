import { logger } from "../config/logger.js";
import { RocksCRUD } from "../utils/rocksCRUD.js";
import { RocksManager } from "./RocksManager.js";

export class DataRelayDispatcher {
    /**
     * Crea un'istanza di MessageService.
     * @param {RocksCRUD} db
     */
    constructor(db) {
        this.db = db;
        this.dataPacker = DataRelayDispatcher.defaultDataPacker;
        this.rocksManager = new RocksManager(db, DataRelayDispatcher.defaultDataPacker);
    }
    /**
     * Invia i dati in pending sul server
     * @param {WebSocket} ws - 
     * @param {string} uuid - 
     */
    sendPendingData = async (ws, uuid) => {
        await this.rocksManager.emptyRecipient(ws, uuid);
    }
    /**
     * Gestisce la ricezione di un dato da WebSocket
     * @param {string} message - Messaggio ricevuto (JSON string)
     * @param {Map<string, WebSocket>} clients - Mappa utenti connessi
     */
    handleData = (message, clients) => {
        const { receiver, data } = JSON.parse(message);
        // -- verifico se il destinatario è online
        // -- se è online, invio il messaggio
        // -- altrimenti, salvo il messaggio in RocksDB per poi inviarlo quando il destinatario riconoscerà la connessione
        console.log(`-----\n${receiver}\n${data}\n-----`);
        
        if (clients.has(receiver)) {
            clients.get(receiver).send(this.dataPacker(data));
        } else {
            this.rocksManager.insert(receiver, data);
        }
    };
    /**
     * Impacchetta un messaggio da inviare via web socket
     * @returns {string}
     */
    static defaultDataPacker(data) {
        return JSON.stringify(data);
    }
}
