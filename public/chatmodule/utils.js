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
        if (!uuid) return false;
        return await this.service.IndexedDb.deleteByIndex('messages', 'chatIdIndex', uuid);
    }

    /**
     * Elimina un messaggio
     * @param {string} ID 
     */
    async deleteMessage(ID) {
        return await this.service.IndexedDb.delete('messages', ID);
    }

    /**
     * Salva un messaggio nell'IndexedDb
     * @param {string} uuid - uuid della chat, nonche uuid dell'utente opposto
     * @param {string} ID - uuid del messaggio
     * @param {*} message - messaggio da salvare
     * @param {number} timestamp - data del messaggio
     * @param {boolean} self - true se inviato da me, false se ricevuto
     */
    async saveMessage(uuid, ID, message, timestamp, self) {
        // -- salvataggio su indexedDb
        const data = this.encodeMessage(uuid, ID, message, timestamp, self);
        this.service.IndexedDb.insert('messages', data);
    }
    /**
     * Codifica un messaggio per essere memorizzato su indexed db
     * @param {string} uuid - uuid del contatto
     * @param {string} ID - uuid del messaggio
     * @param {*} message - messaggio da salvare
     * @param {number} timestamp - data del messaggio
     * @param {boolean} self - true se inviato da me, false se ricevuto
     * @returns {Array}
     */
    encodeMessage(uuid, ID, message, timestamp, self) {
        return { id: ID, chatId: uuid, msg: [message, timestamp, self]};
    }
};