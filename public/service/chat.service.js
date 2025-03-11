import { WebSocketClient } from "../clients/webSocket.client.js";
import { ECDH } from "../secure/ecdh.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "../utils/bytes.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import msgpack from "../utils/msgpack.min.js";
import { Contact } from "../DTO/contact.js";
import { Bus } from "../utils/eventBus.js";
import { API } from "../utils/api.js";
import { UUID } from "../utils/uuid.js";
import { IndexedDb } from "../utils/indexeddb.js";

/**
 * Classe che gestisce la logica di chat:
 */
export class ChatService {
    // eventi gestiti dal WebSocketClient
    static eventsHandler = {
        onmessage: this.onmessage,
        onclose: this.onclose,
        onerror: this.onerror,
    };
    /**
     * Istanza di index db per gestire i messaggi
     */
    static indexedDb = new IndexedDb("chat", "messagges");
    /**
     * Istanza del web socket client
     * @type {WebSocketClient}
     */
    static client = null;
    /**
     * email corrente dell'utente (lo imposteremo all'inizializzazione)
     * @type {string}
     */
    static email = null;
    /**
     * uuid corrente dell'utente (lo imposteremo all'inizializzazione)
     * @type {string}
     */
    static uuid = null;
    /**
     * master key attuale (usata per cifrare i dati in localStorage)
     * @type {Uint8Array}
     */
    static masterKey = null;
    // mappa per richieste di chat in sospeso (chiave = userID, valore = privateKey)
    static pendingChats = new Map();
    /**
     * mappa per i metadati delle richieste delle chat in arrivo
     * @type {Object}
     */
    static chatRequests = {};
    // mappa per i segreti condivisi (chiave = userID, valore = Conctact)
    static contacts = new Map();
    static initialize = false;
    /**
     * contiene gli array dei messaggi che l'utente ha con gli altri, quindi
     * this.chats[sender] = [self, message, timestamp]
     * @type {Object<Array>}
     */
    static chats = {};
    /**
     * inizializza la connessione websocket
     */
    static async init() {
        if (this.initialize) return;
        // -- recupero l'uuid locale
        this.email = await LocalStorage.get("email-utente");
        this.uuid = SessionStorage.get("uid");
        this.masterKey = SessionStorage.get("master-key");
        // -- creo il client websocket
        this.client = new WebSocketClient(this.eventsHandler);
        // -- ripristino i dati da localStorage
        await this.loadLocalData();
        this.initialize = true;
    }

    /**
     * invia una richiesta di chat a un utente
     * @param {string} receiverID - uuid del destinatario
     * @returns {boolean}
     */
    static async requestChat(receiverID) {
        // -- genero una coppia di chiavi (privata e pubblica)
        const keyPair = await ECDH.generate_keys();
        const privateKey = keyPair.private_key[0];
        const publicKeyHex = Bytes.hex.encode(keyPair.public_key[1]);
        // -- memorizzo la chiave privata in attesa della risposta
        this.pendingChats.set(receiverID, privateKey);
        // -- aggiorno la memoria locale
        await this.savePendingChats();
        // -- creo il messaggio con le proprietà necessarie
        const message = {
            from: this.uuid,
            email: this.email,
            timestamp: Date.now(),
            recipientID: receiverID,
            type: "chat_request",
            public_key: publicKeyHex,
        };
        // -- invio il messaggio tramite il WebSocketClient
        return this.client.send(receiverID, message);
    }

    /**
     * accetta una richiesta di chat da un altro utente,
     * genera il segreto condiviso e lo memorizza
     * @param {string} senderID - uuid del mittente
     * @param {string} email - email del mittente
     */
    static async acceptChat(senderID, email) {
        // -- recupero la chiave pubblica del mittente in pendingChats
        const senderPublicKeyHex = this.pendingChats.get(senderID);
        if (!senderPublicKeyHex) {
            console.warn(`Nessuna pending chat trovata per ${senderID}`);
            return;
        }
        // -- genero la coppia di chiavi per l'utente locale
        const keyPair = await ECDH.generate_keys();
        const privateKey = keyPair.private_key[0];
        const publicKeyHex = Bytes.hex.encode(keyPair.public_key[1]);
        // -- calcolo il segreto condiviso
        const senderPublicKey = await ECDH.import_public_key(
            Bytes.hex.decode(senderPublicKeyHex)
        );
        const sharedSecret = await ECDH.derive_shared_secret(
            privateKey,
            senderPublicKey
        );
        // -- memorizzo il segreto condiviso
        this.contacts.set(senderID, new Contact(senderID, email, sharedSecret));
        // -- rimuovo la pending
        this.pendingChats.delete(senderID);
        delete this.chatRequests[senderID];
        // -- salvo su localStorage
        await this.saveChatRequests();
        await this.savePendingChats();
        await this.saveContacts();
        // -- preparo la risposta
        const responseMessage = {
            recipientID: senderID,
            from: this.uuid,
            email: this.email,
            type: "chat_response",
            public_key: publicKeyHex,
        };
        // -- emetto un evento
        Bus.dispatchEvent(
            new CustomEvent("chat-established", { detail: email })
        );
        // -- invio la risposta
        return this.client.send(senderID, responseMessage);
    }

    /**
     * Elimina un contatto.
     * @param {string} uuid - L'UUID del contatto da eliminare.
     * @returns {Promise<boolean>}
     */
    static async deleteContact(uuid) {
        // -- Rimuovo il contatto dalla mappa contacts.
        this.contacts.delete(uuid);
        // -- Aggiorno i contatti su localStorage.
        await this.saveContacts();
        // -- Rimuovo la cronologia della chat locale se presente.
        delete this.chats[uuid];
        // -- Preparo il messaggio di eliminazione chat.
        const message = {
            from: this.uuid,
            recipientID: uuid,
            type: "chat_delete",
            timestamp: Date.now(),
        };
        // -- Inoltro il messaggio tramite il WebSocketClient.
        this.client.send(uuid, message);
        // -- Emetto un evento per notificare l'eliminazione della chat.
        Bus.dispatchEvent(new CustomEvent("chat-deleted", { detail: uuid }));
        return true;
    }

    /**
     * Ignora una richiesta di chat da parte di un utente
     * @param {string} senderID
     * @returns {boolean}
     */
    static async ignoreRequest(senderID) {
        // -- rimuove la pending
        this.pendingChats.delete(senderID);
        delete this.chatRequests[senderID];
        // -- salva su localStorage
        await this.saveChatRequests();
        await this.savePendingChats();
        return true;
    }

    /**
     * invia un messaggio di testo (o un payload generico) a un utente
     * @param {string} contactUUID
     * @param {*} message - il contenuto da inviare (può essere testo, oggetto, ecc.)
     */
    static async sendMessage(contactUUID, message) {
        // -- recupero il segreto condiviso con il destinatario
        const contact = this.contacts.get(contactUUID);
        if (!contact) {
            console.warn(
                `Nessun segreto condiviso con ${contactUUID}, impossibile inviare il messaggio`
            );
            return;
        }
        // -- genero un ID univoco per il messaggio
        const ID = UUID.v4();
        // -- codifico il messaggio (ad es. usando msgpack)
        const encoded = msgpack.encode(message);
        // -- cifro con AES-256-GCM
        const encrypted = await AES256GCM.encrypt(encoded, contact.secret);
        // -- preparo il payload da inviare come messaggio
        const dataToSend = {
            from: this.uuid,
            recipientID: contactUUID,
            ID,
            type: "msg",
            data: encrypted,
            timestamp: Date.now(),
        };
        // -- memorizzo su ram il msg
        this.saveMessage(contactUUID, ID, message, Date.now(), true);
        // -- salvo su indexdb
        // this.indexedDb.insert({
        //     ID,
        //     sender: this.uuid,
        //     data: message,
        //     timestamp: Date.now(),
        // });
        // -- invio il messaggio tramite il client web socket
        this.client.send(contactUUID, dataToSend);
        // --
        return ID;
    }

    /**
     * metodo invocato dal WebSocketClient quando arriva un messaggio
     * @param {Object} data - dati ricevuti, già decifrati e decodificati
     */
    static async onmessage(data) {
        // -- smisto i messaggi in base a 'type'
        switch (data.type) {
            case "chat_request":
                return ChatService.handleChatRequest(data);
            case "chat_response":
                return ChatService.handleChatResponse(data);
            case "msg":
                return ChatService.handleMsg(data);
            case "chat_delete":
                return ChatService.handleChatDelete(data);
            default:
                return ChatService.handleUnknownType(data);
        }
    }

    // -- gestione chat_request
    static async handleChatRequest(data) {
        // -- log
        console.log(`📩 richiesta di chat da ${data.from}`);
        // -- salvo la chiave pubblica del mittente in pendingChats
        this.pendingChats.set(data.from, data.public_key);
        // -- emetto un evento
        const detail = {
            from: data.from,
            email: data.email,
            timestamp: data.timestamp,
        };
        Bus.dispatchEvent(new CustomEvent("new-chat-request", { detail }));
        this.chatRequests[data.from] = detail;
        // -- salvo su localStorage
        await this.saveChatRequests();
        await this.savePendingChats();
    }

    // -- gestione chat_response
    static async handleChatResponse(data) {
        // -- l'utente locale riceve la chiave pubblica dell'altro
        if (!this.pendingChats.has(data.from)) return;
        // -- recupero la propria chiave privata
        const privateKey = this.pendingChats.get(data.from);
        // -- importo la chiave pubblica dell'altro
        const remotePublicKey = await ECDH.import_public_key(
            Bytes.hex.decode(data.public_key)
        );
        // -- calcolo il segreto condiviso
        const sharedSecret = await ECDH.derive_shared_secret(
            privateKey,
            remotePublicKey
        );
        // -- memorizzo il segreto condiviso
        this.contacts.set(
            data.from,
            new Contact(data.from, data.email, sharedSecret)
        );
        // -- rimuovo la pending
        this.pendingChats.delete(data.from);
        delete this.chatRequests[data.from];
        // -- salvo su localStorage
        await this.saveChatRequests();
        await this.savePendingChats();
        await this.saveContacts();
        console.log(`🔐 chat sicura stabilita con ${data.from}`);
        // -- emetto un evento
        Bus.dispatchEvent(
            new CustomEvent("chat-established", { detail: data.from })
        );
    }

    /**
     * Gestisce il messaggio "chat_delete" ricevuto.
     * @param {Object} data - Il messaggio ricevuto con type "chat_delete".
     */
    static async handleChatDelete(data) {
        // -- Se il contatto esiste nella mappa contacts.
        if (this.contacts.has(data.from)) {
            // -- Rimuovo il contatto.
            this.contacts.delete(data.from);
            // -- Aggiorno i contatti su localStorage.
            await this.saveContacts();
            // -- Rimuovo la cronologia locale della chat, se presente.
            delete this.chats[data.from];
            // -- Emetto un evento per notificare la cancellazione della chat.
            Bus.dispatchEvent(
                new CustomEvent("chat-deleted", { detail: data.from })
            );
        }
    }

    // -- gestione msg
    static async handleMsg(data) {
        // -- recupero il segreto condiviso
        const contact = this.contacts.get(data.from);
        if (!contact) {
            console.warn(
                `nessun segreto condiviso con ${data.from}, impossibile decifrare il messaggio`
            );
            return;
        }
        // -- decifro i dati usando aes256-gcm
        const plainBytes = await AES256GCM.decrypt(data.data, contact.secret);
        // -- decodifico il messaggio
        const message = msgpack.decode(plainBytes);
        // -- salvo il messaggio nell'array
        this.saveMessage(data.from, data.ID, message, data.timestamp, false);
        // -- salvo su indexdb
        // this.indexedDb.insert({
        //     ID: data.ID,
        //     sender: data.from,
        //     data: message,
        //     timestamp: data.timestamp,
        // });
        // -- emetto un evento
        Bus.dispatchEvent(
            new CustomEvent("new-message", {
                detail: {
                    ID: data.ID,
                    nickname: contact.nickname,
                    sender: data.from,
                    message,
                    timestamp: data.timestamp,
                },
            })
        );
    }
    /**
     * Salva un messaggio nell'array della chat con l'utente
     * @param {string} chatId - uuid del mittente, nonche id della chat
     * @param {string} ID - uuid del messaggio
     * @param {*} message
     * @param {Date} timestamp
     */
    static saveMessage(chatId, ID, message, timestamp, self) {
        // -- se non esiste l'array lo creo
        if (!(this.chats[chatId] instanceof Array)) this.chats[chatId] = [];
        // ---
        this.chats[chatId].push([ID, message, timestamp, self]);
    }

    // -- gestione tipi sconosciuti
    static handleUnknownType(data) {
        console.warn("❌ tipo di messaggio sconosciuto", data);
    }

    /**
     * chiusura della connessione
     */
    static onclose() {
        console.log("❌ connessione websocket chiusa");
    }

    /**
     * errore sul socket
     * @param {Error} error
     */
    static onerror(error) {
        console.error("❌ errore websocket:", error);
    }

    /**
     * Salva la mappa delle pendingChat sul localstorage
     */
    static async savePendingChats() {
        // converto la mappa in oggetto semplice
        const obj = Object.fromEntries(this.pendingChats);
        // salvo cifrato con la masterKey
        await LocalStorage.set("pendingChats", obj, this.masterKey);
    }
    /**
     * Salva l'oggetto delle chat requests
     */
    static async saveChatRequests() {
        await LocalStorage.set(
            "chatRequests",
            this.chatRequests,
            this.masterKey
        );
    }

    // -- salva la mappa dei contatti su localStorage
    static async saveContacts() {
        const obj = Object.fromEntries(
            // i valori sono Uint8Array, li convertiamo in base64 o lasciamo come typed array?
            // se vogliamo salvare come typed array, passiamo direttamente l'Uint8Array
            // e msgpack si occupa di codificare. Qui va bene così.
            this.contacts
        );
        await LocalStorage.set("contacts", obj, this.masterKey);
    }

    /**
     * Carica i dati dal localstorage, decrittografandoli con la master-key
     */
    static async loadLocalData() {
        // -- carico pendingChats
        const pending = await LocalStorage.get("pendingChats", this.masterKey);
        if (pending && typeof pending === "object") {
            // ricostruisco la mappa
            this.pendingChats = new Map(Object.entries(pending));
        }
        // -- carico chatRequests
        const chatRequests = await LocalStorage.get(
            "chatRequests",
            this.masterKey
        );
        if (chatRequests && typeof chatRequests === "object") {
            this.chatRequests = chatRequests;
        }
        // -- carico contatti
        const contacts = await LocalStorage.get("contacts", this.masterKey);
        if (contacts && typeof contacts === "object") {
            // -- inizializzo la mappa e ricostruisco per ogni entry un'istanza di Contact
            this.contacts = new Map();
            Object.entries(contacts).forEach(([id, data]) => {
                const contact = new Contact(
                    id,
                    data.email || "",
                    data.secret,
                    data.nickname
                );
                this.contacts.set(id, contact);
            });
        }
    }

    /**
     * API HTTP
     */

    /**
     * Restituisce una lista di utenti che corrispondono in like all'email passata
     * @param {string} email
     * @returns {Array}
     */
    static async searchUser(email) {
        const res = await API.fetch(`/auth/search/${email}`, {
            loader: true,
            method: "GET",
        });
        // ---
        if (!res) return false;
        return res;
    }
}
