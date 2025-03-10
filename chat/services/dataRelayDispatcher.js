import { RocksCRUD } from "../utils/rocksCRUD.js";
import { RocksManager } from "./RocksManager.js";

export class DataRelayDispatcher {
    /**
     * Crea un'istanza di MessageService.
     * @param {RocksCRUD} db
     */
    constructor(db) {
        this.db = db;
        this.rocksManager = new RocksManager(db, DataRelayDispatcher.defaultDataPacker);
    }
    /**
     * Invia i dati in pending sul server
     * @param {WebSocket} ws - 
     * @param {string} uuid - 
     */
    sendPendingData = async (ws) => {
        await this.rocksManager.emptyRecipient(ws, ws.userUUID);
    }
    /**
     * Gestisce la ricezione di un dato da WebSocket
     * @param {string} decryptedData - Messaggio ricevuto e decrittato
     * @param {Map<string, WebSocket>} wsUserMap - Mappa utenti connessi
     * 
     */
    handleData = (decryptedData, wsUserMap, clients) => {
        const { recipientID: userUUID, data } = decryptedData;
        // -- verifico se il destinatario è online
        // -- se è online, invio il messaggio
        // -- altrimenti, salvo il messaggio in RocksDB per poi inviarlo quando il destinatario riconoscerà la connessione        
        const wsUUID = wsUserMap.get(userUUID);
        if (wsUUID) {
            clients.get(wsUUID).sendE(data);
        } else {
            this.rocksManager.insert(userUUID, data);
        }
    };
}
