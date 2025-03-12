import { API } from "../utils/api.js";

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
     * Salva un messaggio nell'array locale della chat e nell'IndexedDb
     * @param {string} ID - uuid del messaggio
     * @param {*} message - messaggio da salvare
     * @param {number} timestamp - data del messaggio
     * @param {boolean} self - true se inviato da me, false se ricevuto
     */
    saveMessage(chatId, ID, message, timestamp, self) {
        if (!(this.service.chats[chatId] instanceof Array)) this.service.chats[chatId] = [];
        this.service.chats[chatId].push([ID, message, timestamp, self]);
    }
};