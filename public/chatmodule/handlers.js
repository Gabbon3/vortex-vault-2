import { Bus } from "../utils/eventBus.js";
import msgpack from "../utils/msgpack.min.js";
import { ECDH } from "../secure/ecdh.js";
import { Contact } from "../DTO/contact.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Cripto } from "../secure/cripto.js";

/**
 * Modulo per la gestione degli eventi in arrivo tramite WebSocket.
 */
export class Handlers {
    constructor(service) {
        this.service = service;
    }
    /**
     * Gestisce i messaggi in ingresso smistandoli al corretto handler.
     * @param {Object} data - I dati del messaggio ricevuto.
     */
    async onmessage(data) {
        switch (data.type) {
            case "chat_request":
                return this.handleChatRequest(data);
            case "chat_response":
                return this.handleChatResponse(data);
            case "msg":
                return this.handleMsg(data);
            case "chat_delete":
                return this.handleChatDelete(data);
            default:
                return this.handleUnknownType(data);
        }
    }

    /**
     * Gestisce una richiesta di chat ricevuta.
     * @param {Object} data
     */
    async handleChatRequest(data) {
        // -- log
        console.log(`📩 richiesta di chat da ${data.from}`);
        // -- salvo la chiave pubblica del mittente in pendingChats
        this.service.pendingKeys.set(data.from, data.public_key);
        const detail = { from: data.from, email: data.email, timestamp: data.timestamp };
        this.service.incomingChatRequests[data.from] = detail;
        // -- emetto un evento
        Bus.dispatchEvent(new CustomEvent('new-chat-request', { detail }));
        // -- salvo su localStorage
        await this.service.storage.saveChatRequests();
        await this.service.storage.savePendingChats();
    }

    /**
     * Gestisce una risposta ad una richiesta di chat.
     * @param {Object} data 
     */
    async handleChatResponse(data) {
        // -- l'utente locale riceve la chiave pubblica dell'altro
        if (!this.service.pendingKeys.has(data.from)) return;
        // -- recupero la propria chiave privata
        const privateKey = this.service.pendingKeys.get(data.from);
        // -- importo la chiave pubblica dell'altro
        const remotePublicKey = await ECDH.import_public_key(Bytes.hex.decode(data.public_key));
        // -- calcolo il segreto condiviso
        const sharedSecret = await ECDH.derive_shared_secret(privateKey, remotePublicKey);
        // -- memorizzo il segreto condiviso
        this.service.contacts.set(data.from, new Contact(data.from, data.email, sharedSecret, data.email.split('@')[0]));
        // -- rimuovo la pending
        this.service.pendingKeys.delete(data.from);
        delete this.service.incomingChatRequests[data.from];
        // -- salvo su localStorage
        await this.service.storage.saveChatRequests();
        await this.service.storage.savePendingChats();
        await this.service.storage.saveContacts();
        console.log(`🔐 chat sicura stabilita con ${data.from}`);
        // -- emetto un evento
        Bus.dispatchEvent(new CustomEvent("chat-established", { detail: data.from }));
    }

    /**
     * Gestisce un messaggio ricevuto.
     * @param {Object} data 
     */
    async handleMsg(data) {
        // -- recupero il segreto condiviso
        const contact = this.service.contacts.get(data.from);
        if (!contact) {
            console.warn(`Nessun segreto condiviso con ${data.from}`);
            return;
        }
        // -- decifro i dati usando aes256-gcm
        const plainBytes = await AES256GCM.decrypt(data.data, contact.secret);
        // -- decodifico il messaggio
        const message = msgpack.decode(plainBytes);
        // -- salvo il messaggio nell'array
        this.service.saveMessage(data.from, data.ID, message, data.timestamp, false);
        // -- emetto un evento
        Bus.dispatchEvent(new CustomEvent("new-message", {
            detail: { ID: data.ID, nickname: contact.nickname, sender: data.from, message, timestamp: data.timestamp }
        }));
    }

    /**
     * Gestisce l'eliminazione di una chat ricevuta.
     * @param {Object} data 
     */
    async handleChatDelete(data) {
        // -- Se il contatto esiste nella mappa contacts.
        const contact = this.service.contacts.get(data.from);
        if (!contact) return false;
        // -- verifico la firma
        const sign = await Cripto.hmac(data.from, contact.secret, { encoding: 'base64' });
        if (sign !== data.sign) {
            console.log(`⛔ Qualcuno ha tentato di eliminarti una chat`);
            return false;
        }
        // -- rimuovo il contatto
        this.service.contacts.delete(data.from);
        await this.service.storage.saveContacts();
        // -- rimuovo la cronologia
        await this.service.utils.clearChat(data.from);
        // -- emetto evento
        Bus.dispatchEvent(new CustomEvent('chat-deleted', { detail: data.from }));
        return true;
    }

    /**
     * Gestisce messaggi sconosciuti.
     * @param {Object} data 
     */
    handleUnknownType(data) {
        console.warn("❌ tipo di messaggio sconosciuto", data);
    }

    onclose() {
        console.log("❌ connessione websocket chiusa");
    }

    onerror(error) {
        console.error("❌ errore websocket:", error);
    }
};