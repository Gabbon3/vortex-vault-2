// ChatService.js

import { WebSocketClient } from "../clients/webSocket.client.js";
import { SessionStorage } from "../utils/session.js";
import { Handlers } from "./handlers.js";
import { Commuters } from "./commuters.js";
import { Storage } from "./storage.js";
import { Utils } from "./utils.js";
import { IndexedDb } from "../utils/indexeddb.js";
import { LocalStorage } from "../utils/local.js";
import { Contact } from "../DTO/contact.js";

export class ChatService {
    static utils = new Utils(this);
    static storage = new Storage(this);
    static handlers = new Handlers(this);
    static commuters = new Commuters(this);
    // ----
    static initialize = false;
    /**
     * Istanza del web socket client
     * @type {WebSocketClient}
     */
    static client = null;
    /**
     * uuid corrente dell'utente (lo imposteremo all'inizializzazione)
     * @type {string}
     */
    static uuid = null;
    /**
     * email corrente dell'utente (lo imposteremo all'inizializzazione)
     * @type {string}
     */
    static email = null;
    /**
     * master key attuale (usata per cifrare i dati in localStorage)
     * @type {Uint8Array}
     */
    static masterKey = null;
    /**
     * mappa per richieste di chat in sospeso (chiave = userID, valore = privateKey)
     * @type {Map}
     */
    static pendingKeys = new Map();
    /**
     * mappa per i metadati delle richieste delle chat in arrivo
     * @type {Object} { from, email, timestamp }
     */
    static incomingChatRequests = {};
    /**
     * Mappa dei contatti dell'utente
     * @type {Map<string, Contact>}
     */
    static contacts = new Map();
    /**
     * Istanza di index db per gestire i messaggi della chat corrente
     * @type {IndexedDb}
     */
    static IndexedDb = null;
    /**
     * UUID della chat attualmente attiva
     * @type {string}
     */
    static activeChatUuid = null;

    /**
     * Inizializza il ChatService.
     */
    static async init() {
        if (this.initialize) return;

        this.email = await LocalStorage.get("email-utente");
        this.uuid = SessionStorage.get("uid");
        this.masterKey = SessionStorage.get("master-key");
        
        // -- inizializzo l'indexed db
        this.IndexedDb = new IndexedDb('chatDB');
        const dbInit = await this.IndexedDb.init('messages', 'id', [{
            name: 'chatIdIndex',
            keyPath: 'chatId',
            unique: false,
        }]);
        console.log('Db Init ->',dbInit);

        // -- inizializzo il websocket
        this.client = new WebSocketClient({
            onmessage: (data) => this.handlers.onmessage(data),
            onclose: this.handlers.onclose,
            onerror: this.handlers.onerror,
        });

        // -- carico dati locali
        await this.storage.loadAll();

        this.initialize = true;
    }

    static async requestChat(receiverID) {
        return this.commuters.requestChat(receiverID);
    }

    static async acceptChat(senderID, email) {
        return this.commuters.acceptChat(senderID, email);
    }

    static async sendMessage(contactUUID, message) {
        return this.commuters.sendMessage(contactUUID, message);
    }

    static async deleteContact(uuid = this.activeChatUuid) {
        return this.commuters.deleteContact(uuid);
    }

    static async clearChat(uuid) {
        return this.utils.clearChat(uuid);
    }

    static async ignoreRequest(senderID) {
        return this.commuters.ignoreRequest(senderID);
    }

    static async searchUser(email) {
        return this.utils.searchUser(email);
    }

    static saveContacts() {
        return this.storage.saveContacts(this);
    }

    /**
     * 
     * @param {string} uuid - uuid dell'utente destinatario
     * @returns 
     */
    static async openChat(uuid) {
        this.activeChatUuid = uuid;
        // ---
        return true;
    }
    
    static async saveMessage(uuid, ID, message, timestamp, self) {
        return await this.utils.saveMessage(uuid, ID, message, timestamp, self);
    }

    static async deleteMessage(ID) {
        return await this.utils.deleteMessage(ID);
    }

    /**
     * Restituisce tutti i messaggi di una chat da indexed db
     * @param {string} uuid 
     * @returns {Array}
     */
    static async getMessages(uuid) {
        return await this.IndexedDb.getAll('messages', 'chatIdIndex', uuid);
    }
}