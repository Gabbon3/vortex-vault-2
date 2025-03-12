import { ECDH } from "../secure/ecdh.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "../utils/bytes.js";
import { UUID } from "../utils/uuid.js";
import msgpack from "../utils/msgpack.min.js";
import { Contact } from "../DTO/contact.js";
import { Bus } from "../utils/eventBus.js";
import { Cripto } from "../secure/cripto.js";

export class Commuters {
    constructor(service) {
        this.service = service;
    }
    /**
     * Invia una richiesta di chat a un utente.
     * @param {string} receiverID
     */
    async requestChat(receiverID) {
        // -- genero una coppia di chiavi (privata e pubblica)
        const keyPair = await ECDH.generate_keys();
        const privateKey = keyPair.private_key[0];
        const publicKeyHex = Bytes.hex.encode(keyPair.public_key[1]);
        // -- memorizzo la chiave privata in attesa della risposta
        this.service.pendingKeys.set(receiverID, privateKey);
        await this.service.storage.savePendingChats();
        // -- creo il messaggio
        const message = {
            from: this.service.uuid,
            email: this.service.email,
            timestamp: Date.now(),
            recipientID: receiverID,
            type: "chat_request",
            public_key: publicKeyHex,
        };
        // -- invio tramite websocket
        return this.service.client.send(receiverID, message);
    }

    /**
     * accetta una richiesta di chat da un altro utente,
     * genera il segreto condiviso e lo memorizza
     * @param {string} senderID - uuid del mittente
     * @param {string} email - email del mittente
     */
    async acceptChat(senderID, email) {
        // -- recupero la chiave pubblica del mittente in pendingChats
        const senderPublicKeyHex = this.service.pendingKeys.get(senderID);
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
        this.service.contacts.set(senderID, new Contact(senderID, email, sharedSecret, email.split('@')[0]));
        // -- rimuovo la pending
        this.service.pendingKeys.delete(senderID);
        delete this.service.incomingChatRequests[senderID];
        // -- salvo su localStorage
        await this.service.storage.saveChatRequests();
        await this.service.storage.savePendingChats();
        await this.service.storage.saveContacts();
        // -- preparo la risposta
        const responseMessage = {
            recipientID: senderID,
            from: this.service.uuid,
            email: this.service.email,
            type: "chat_response",
            public_key: publicKeyHex,
        };
        // -- emetto un evento
        Bus.dispatchEvent(
            new CustomEvent("chat-established", { detail: email })
        );
        // -- invio la risposta
        return this.service.client.send(senderID, responseMessage);
    }

    /**
     * Elimina un contatto.
     * @param {string} uuid - L'UUID del contatto da eliminare. 
     * @returns {Promise<boolean>}
     */
    async deleteContact(uuid) {
        const contact = this.service.contacts.get(uuid);
        if (!contact) return false;
        // -- Creo una firma per autenticare l'operazione, usando la chiave derivata con l'altro utente
        // -- in questo modo solo i due utenti possono autenticarsi
        // --- in questo modo prevengo l'utilizzo illecito di questa azione
        // --- senza la firma, si potrebbe a prescinere dalla relazione con un altro contatto
        // --- eliminare le chat altrui, basterebbe conoscere lo uuid degli utenti
        const sign = await Cripto.hmac(this.service.uuid, contact.secret, { encoding: 'base64' });
        // -- Rimuovo il contatto dalla mappa contacts.
        this.service.contacts.delete(uuid);
        // -- Aggiorno i contatti su localStorage.
        await this.service.storage.saveContacts();
        // -- Rimuovo la cronologia della chat locale se presente.
        await this.service.utils.deleteChatFromIndexedDb(uuid);
        // -- Preparo il messaggio di eliminazione chat.
        const message = {
            from: this.service.uuid,
            sign,
            recipientID: uuid,
            type: "chat_delete",
            timestamp: Date.now(),
        };
        // -- Inoltro il messaggio tramite il WebSocketClient.
        this.service.client.send(uuid, message);
        // -- Emetto un evento per notificare l'eliminazione della chat.
        Bus.dispatchEvent(new CustomEvent("chat-deleted", { detail: uuid }));
        return true;
    }

    /**
     * Invia un messaggio a un utente.
     * @param {string} contactUUID
     * @param {*} message
     */
    async sendMessage(contactUUID, message) {
        const contact = this.service.contacts.get(contactUUID);
        if (!contact) {
            console.warn(`Nessun segreto condiviso con ${contactUUID}`);
            return;
        }
        // -- preparo il messaggio
        const ID = UUID.v4();
        const encoded = msgpack.encode(message);
        const encrypted = await AES256GCM.encrypt(encoded, contact.secret);
        // -- costruisco il payload
        const dataToSend = {
            from: this.service.uuid,
            recipientID: contactUUID,
            ID,
            type: "msg",
            data: encrypted,
            timestamp: Date.now(),
        };
        // -- salvo messaggio localmente
        this.service.saveMessage(contactUUID, ID, message, Date.now(), true);
        // -- invio messaggio tramite websocket
        this.service.client.send(contactUUID, dataToSend);
        return ID;
    }

    /**
     * Invia un messaggio di eliminazione chat.
     * @param {string} contactUUID
     * @param {string} sign
     */
    async deleteChat(contactUUID, sign) {
        const message = {
            from: this.service.uuid,
            recipientID: contactUUID,
            sign,
            type: "chat_delete",
            timestamp: Date.now(),
        };
        this.service.client.send(contactUUID, message);
    }
};
