import { WebSocketClient } from "../clients/webSocket.client.js";
import { ECDH } from "../secure/ecdh.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "../utils/bytes.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import msgpack from "../utils/msgpack.min.js";

/**
 * Classe che gestisce la logica di chat:
 * - avvio (requestChat)
 * - accettazione (acceptChat)
 * - gestione dei messaggi in arrivo
 *
 * Le mappe pendingChats e sharedSecrets vengono salvate sul localStorage (cifrato con la masterKey).
 */
export class ChatService {
    // eventi gestiti dal WebSocketClient
    static eventsHandler = {
        onmessage: this.onmessage,
        onclose: this.onclose,
        onerror: this.onerror,
    };

    // istanza del client websocket
    static client = null;
    // uuid corrente dell'utente (lo imposteremo all'inizializzazione)
    static uuid = null;
    // master key attuale (usata per cifrare i dati in localStorage)
    static masterKey = null;
    // mappa per richieste di chat in sospeso (chiave = userID, valore = privateKey)
    static pendingChats = new Map();
    // mappa per i segreti condivisi (chiave = userID, valore = sharedSecret)
    static sharedSecrets = new Map();
    static initialize = false;

    /**
     * inizializza la connessione websocket
     */
    static async init() {
        if (this.initialize) return;
        this.initialize = true;
        // -- recupero l'uuid locale
        this.uuid = SessionStorage.get("uid");
        this.masterKey = SessionStorage.get("master-key");
        // -- creo il client websocket
        this.client = new WebSocketClient(this.eventsHandler);
        // -- ripristino i dati da localStorage
        await this.loadLocalData();
    }

    /**
     * invia una richiesta di chat a un utente
     * @param {string} receiverID - uuid del destinatario
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
     */
    static async acceptChat(senderID) {
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
        this.sharedSecrets.set(senderID, sharedSecret);
        // -- rimuovo la pending
        this.pendingChats.delete(senderID);
        // -- salvo su localStorage
        await this.savePendingChats();
        await this.saveSharedSecrets();
        // -- preparo la risposta
        const responseMessage = {
            from: this.uuid,
            recipientID: senderID,
            type: "chat_response",
            public_key: publicKeyHex,
        };
        // -- invio la risposta
        return this.client.send(senderID, responseMessage);
    }

    /**
     * invia un messaggio di testo (o un payload generico) a un utente
     * @param {string} recipientID - l'UUID del destinatario
     * @param {*} message - il contenuto da inviare (può essere testo, oggetto, ecc.)
     */
    static async sendMessage(recipientID, message) {
        // -- recupero il segreto condiviso con il destinatario
        const sharedSecret = this.sharedSecrets.get(recipientID);
        if (!sharedSecret) {
            console.warn(
                `nessun segreto condiviso con ${recipientID}, impossibile inviare il messaggio`
            );
            return;
        }
        // -- codifico il messaggio (ad es. usando msgpack)
        const encoded = msgpack.encode(message);
        // -- cifro con AES-256-GCM
        const encrypted = await AES256GCM.encrypt(encoded, sharedSecret);
        // -- preparo il payload da inviare come messaggio
        const dataToSend = {
            from: this.uuid,
            recipientID: recipientID,
            type: "msg",
            data: encrypted,
        };
        // -- invio il messaggio tramite il client web socket
        this.client.send(recipientID, dataToSend);
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
        // -- salvo su localStorage
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
        this.sharedSecrets.set(data.from, sharedSecret);
        // -- rimuovo la pending
        this.pendingChats.delete(data.from);
        // -- salvo su localStorage
        await this.savePendingChats();
        await this.saveSharedSecrets();
        console.log(`🔐 chat sicura stabilita con ${data.from}`);
    }

    // -- gestione msg
    static async handleMsg(data) {
        // -- recupero il segreto condiviso
        const sharedSecret = this.sharedSecrets.get(data.from);
        if (!sharedSecret) {
            console.warn(
                `nessun segreto condiviso con ${data.from}, impossibile decifrare il messaggio`
            );
            return;
        }
        // -- decifro i dati usando aes256-gcm
        const plainBytes = await AES256GCM.decrypt(data.data, sharedSecret);
        // -- decodifico il messaggio
        const message = msgpack.decode(plainBytes);
        console.log(`💬 messaggio da ${data.from}:`, message);
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

    // -- salva la mappa pendingChats su localStorage
    static async savePendingChats() {
        // converto la mappa in oggetto semplice
        const obj = Object.fromEntries(this.pendingChats);
        // salvo cifrato con la masterKey
        await LocalStorage.set("pendingChats", obj, this.masterKey);
    }

    // -- salva la mappa sharedSecrets su localStorage
    static async saveSharedSecrets() {
        const obj = Object.fromEntries(
            // i valori sono Uint8Array, li convertiamo in base64 o lasciamo come typed array?
            // se vogliamo salvare come typed array, passiamo direttamente l'Uint8Array
            // e msgpack si occupa di codificare. Qui va bene così.
            this.sharedSecrets
        );
        await LocalStorage.set("sharedSecrets", obj, this.masterKey);
    }

    // -- carica i dati da localStorage
    static async loadLocalData() {
        // carico pendingChats
        const pending = await LocalStorage.get("pendingChats", this.masterKey);
        if (pending && typeof pending === "object") {
            // ricostruisco la mappa
            this.pendingChats = new Map(Object.entries(pending));
        }
        // carico sharedSecrets
        const secrets = await LocalStorage.get("sharedSecrets", this.masterKey);
        if (secrets && typeof secrets === "object") {
            this.sharedSecrets = new Map(Object.entries(secrets));
            // i valori recuperati sono typed array (grazie a msgpack),
            // quindi li posso usare subito come `Uint8Array`.
        }
    }
}
