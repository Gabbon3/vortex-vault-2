import { LocalStorage } from "../utils/local.js";
import { Contact } from "../DTO/contact.js";

export class Storage {
    constructor(service) {
        this.service = service;
    }
    /**
     * Salva la mappa delle chat in sospeso sul localStorage.
     */
    async savePendingChats() {
        const obj = Object.fromEntries(this.service.pendingKeys);
        await LocalStorage.set("pendingKeys", obj, this.service.masterKey);
    }

    /**
     * Salva le richieste di chat ricevute sul localStorage.
     */
    async saveChatRequests() {
        await LocalStorage.set("incomingChatRequests", this.service.incomingChatRequests, this.service.masterKey);
    }

    /**
     * Salva la mappa dei contatti sul localStorage.
     */
    async saveContacts() {
        const obj = Object.fromEntries(this.service.contacts);
        await LocalStorage.set("contacts", obj, this.service.masterKey);
    }

    /**
     * Carica tutti i dati locali (pendingKeys, chatRequests e contatti) dal localStorage.
     */
    async loadAll() {
        const pending = await LocalStorage.get("pendingKeys", this.service.masterKey);
        if (pending) this.service.pendingKeys = new Map(Object.entries(pending));

        const chatRequests = await LocalStorage.get("chatRequests", this.service.masterKey);
        if (chatRequests) this.service.incomingChatRequests = chatRequests;

        const contacts = await LocalStorage.get("contacts", this.service.masterKey);
        if (contacts) {
            this.service.contacts = new Map();
            Object.entries(contacts).forEach(([id, data]) => {
                this.service.contacts.set(id, new Contact(id, data.email, data.secret, data.nickname));
            });
        }
    }
};