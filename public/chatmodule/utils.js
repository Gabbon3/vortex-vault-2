import { API } from "../utils/api.js";
import { IndexedDb } from "../utils/indexeddb.js";

export class Utils {
    constructor(service) {
        this.service = service;
    }

    /**
     * Effettua una ricerca utenti tramite email.
     * @param {string} email
     * @returns {Promise<Array|boolean>}
     */
    async searchUser(email) {
        const res = await API.fetch(`/auth/search/${email}`, {
            loader: true,
            method: "GET",
        });

        return res || false;
    }

    /**
     * Effettua la pulizia di una chat, eliminando tutti i messaggi
     * @param {string} uuid - id del db, nonche uuid del contatto
     * @returns {boolean}
     */
    async clearChat(uuid = null) {
        // -- se non viene passato un uuid specifico, si presume che il db da svuotare sia quello attualmente attivo
        // -- oppure se lo uuid passato corrisponde alla chat attualmente attiva
        if (!uuid || uuid === this.service.activeChatUuid) return this.service.currentIndexDb.clearStore();
        // -- se no, creo un istanza a parte ed effettuo lo svuotamento
        const externalDb = new IndexedDb(uuid, 'messages');
        await externalDb.init();
        return await externalDb.clearStore();
    }

    /**
     * Elimina il db associato ad una chat, quindi anche i messaggi
     * @param {string} uuid - id del db, nonche uuid del contatto
     * @returns {boolean}
     */
    async deleteChatFromIndexedDb(uuid = null) {
        // -- se non viene passato un uuid specifico, si presume che il db da eliminare sia quello attualmente attivo
        // -- oppure se lo uuid passato corrisponde alla chat attualmente attiva
        if (!uuid || uuid === this.service.activeChatUuid) return this.service.currentIndexDb.clearStore();
        // -- se no, creo un istanza a parte ed effettuo lo svuotamento
        const externalDb = new IndexedDb(uuid, 'messages');
        await externalDb.init();
        return await externalDb.deleteDatabase();
    }

    /**
     * Elimina un messaggio
     * @param {string} ID 
     */
    async deleteMessage(ID) {
        return await this.service.currentIndexDb.delete(ID);
    }

    /**
     * Salva un messaggio nell'IndexedDb
     * @param {string} chatId - uuid della chat, nonche uuid dell'utente opposto
     * @param {string} ID - uuid del messaggio
     * @param {*} message - messaggio da salvare
     * @param {number} timestamp - data del messaggio
     * @param {boolean} self - true se inviato da me, false se ricevuto
     */
    async saveMessage(chatId, ID, message, timestamp, self) {
        // -- salvataggio su indexedDb
        const currentDb = this.service.activeChatUuid === chatId;
        const data = this.encodeMessage(ID, message, timestamp, self);
        if (currentDb) {
            this.service.currentIndexDb.insert(data);
        }
        // -- inserisco il messaggio su un db diverso da quello attivo
        else {
            const externalDb = new IndexedDb(chatId, 'messages');
            await externalDb.init();
            await externalDb.insert(data);
        }
    }
    /**
     * Codifica un messaggio per essere memorizzato su indexed db
     * @param {string} ID - uuid del messaggio
     * @param {*} message - messaggio da salvare
     * @param {number} timestamp - data del messaggio
     * @param {boolean} self - true se inviato da me, false se ricevuto
     * @returns {Array}
     */
    encodeMessage(ID, message, timestamp, self) {
        return { id: ID, msg: [message, timestamp, self]};
    }
};