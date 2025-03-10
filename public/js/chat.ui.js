import { ChatService } from "../service/chat.service.js";
import { date } from "../utils/dateUtils.js";
import { Form } from "../utils/form.js";
import { Search } from "../utils/search.js";
import { Bus } from "../utils/eventBus.js";
import { Log } from "../utils/log.js";

window.ChatService = ChatService;

document.addEventListener("DOMContentLoaded", async () => {
    await ChatService.init();
    ChatUI.init_html();
    ChatUI.html_contacts();
    /**
     * Send Chat Request
     */
    Form.onsubmit("form-send-chat-request", async (form, elements) => {
        console.log(elements);
    });
    /**
     * Invio messaggio
     */
    Form.onsubmit("send-message", async (form, elements) => {
        const { msg } = elements;
        await ChatService.sendMessage(ChatUI.activeChatUuid, msg);
        ChatUI.appendMessage(msg, Date.now(), true);
        form.reset();
    });
    /**
     * Ricerca Contatto
     */
    document.getElementById("search-contact").addEventListener("keyup", (e) => {
        ChatUI.search.tabella(e.currentTarget, "contacts-list", "contact-li");
    });
    /**
     * Nuovo messaggio arrivato
     */
    Bus.addEventListener("new-message", (event) => {
        const { message, sender, timestamp, nickname } = event.detail;
        // -- invio una notifica con il browser
        new Notification(`${nickname}`, {
            body: message,
            icon: "./img/vortex_vault_logo.png",
        });
        if (sender !== ChatUI.activeChatUuid) return;
        // -- stampo il messaggio
        ChatUI.appendMessage(message, timestamp, false);
    });
    /**
     * Nessuna autenticazione per il web socket
     */
    Bus.addEventListener('ws-no-auth', (event) => {
        Log.summon(1, 'Sign-in first', () => { window.location.href = '/signin' });
    });
});

export class ChatUI {
    static search = new Search(true, null, null, 100);
    static html_initialized = false;
    static html_list = null;
    static messages = null;
    static current_order = "az";
    static chatContactName = null;
    static activeChatUuid = null;
    /**
     * Inizializza gli elementi html utili al funzionamento
     */
    static init_html() {
        if (this.html_initialized) return;
        // -- verifico se ce il permesso per le notifiche
        if (Notification.permission !== "denied" && Notification.permission !== "granted") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification("Vortex Chat", {
                        body: "Have you correctly enabled notifications for Vortex Chat..",
                        icon: "./img/vortex_vault_logo.png",
                    });
                }
            });
        }
        // ---
        this.html_list = document.getElementById("contacts-list");
        // -- container della chat
        this.messages = document.getElementById("messages");
        // -- Nome di contatto
        this.chatContactName = document.getElementById("chat-contact-name");
        // - evento per selezionare tutto il testo del contatto
        this.chatContactName.addEventListener("click", (e) => {
            // -- creo un range e seleziona il contenuto del nodo
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            // -- ottengo la selezione attuale e la sostituisce con il nuovo range
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
        // - evento per cambiare il nickname di un contatto
        this.chatContactName.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.currentTarget.blur();
            const newNickname = e.currentTarget.textContent;
            // ---
            const contact = ChatService.contacts.get(this.activeChatUuid);
            contact.nickname = newNickname;
            // -- salvo i contatti nuovamente in locale
            ChatService.contacts.set(this.activeChatUuid, contact);
            ChatService.saveContacts();
            this.html_contacts();
        });
        // ---
        this.html_initialized = true;
    }
    /**
     * Apre la finestra della chat con una persona
     * @param {string} uuid
     */
    static openChat(uuid) {
        const contact = ChatService.contacts.get(uuid);
        if (!contact) return;
        // -- preparo l'html da stampare per i messaggi
        const html = this.htmlChat(ChatService.chats[uuid]);
        this.messages.innerHTML = html;
        this.chatContactName.textContent = contact.nickname ?? contact.uuid;
    }
    /**
     * Genera il codice html di tutti i messaggi di una chat
     * @param {Array} messages
     * @returns {string}
     */
    static htmlChat(messages) {
        if (!messages || !(messages instanceof Array)) return "";
        // ---
        let html = "";
        const l = messages.length;
        for (let i = 0; i < l; i++) {
            const [message, timestamp, self] = messages[i];
            html += this.htmlMessage(message, timestamp, self);
        }
        return html;
    }
    /**
     * Appende un messaggio nella chat html
     * @param {string} message -
     * @param {Date} timestamp -
     * @param {boolean} self - true se il messaggio è dell'utente corrente, false di un contatto
     */
    static appendMessage(message, timestamp, self) {
        this.messages.innerHTML += this.htmlMessage(message, timestamp, self);
    }
    /**
     * Restituisce il codice html di un messaggio
     * @param {*} message
     * @param {number} timestamp - data in millisecondi
     * @param {boolean} self
     * @returns
     */
    static htmlMessage(message, timestamp, self) {
        return `<message-g self="${self}" msg="${message}" timestamp="${timestamp}"></message-g>`;
    }
    /**
     * funzioni di ordinamento
     */
    static order_functions = {
        az: (a, b) => a.nickname.localeCompare(b.nickname),
        za: (a, b) => b.nickname.localeCompare(a.nickname),
        dateup: (a, b) => new Date(a.lastAccess) - new Date(b.lastAccess),
        datedown: (a, b) => new Date(b.lastAccess) - new Date(a.lastAccess),
    };
    /**
     * Genera il codice html per i contatti
     * @param {string} order - az, za, dateup, datedown, secureup, securedown
     */
    static html_contacts(order = this.current_order) {
        const contactsList = Array.from(ChatService.contacts.values());
        if (contactsList.length === 0)
            return (document.querySelector("#contacts-list").innerHTML = "");
        let html = ``;
        const get_checkpoint = (order, vault) => {
            return order === "az" || order === "za"
                ? vault.nickname
                    ? vault.nickname[0].toUpperCase()
                    : "*"
                : date.format("%j %M %y", new Date(vault.updatedAt));
        };
        // -- preparo i vaults da iterare
        // -- mostro il numero totale di elementi disponibili
        // this.vault_counter_element.textContent = contactsList.length;
        // -- se non ci sono vault da mostrare termino qui
        if (contactsList.length === 0) return (this.html_list.innerHTML = "");

        // -- ordino
        const order_function = this.order_functions[order];
        contactsList.sort(order_function);
        // -- gestisco la logica dei checkpoint (lettere o date)
        let checkpoint = get_checkpoint(order, contactsList[0]);
        html += `<span class="checkpoint">${checkpoint}</span><div class="group">`;
        for (const contact of contactsList) {
            const current_checkpoint = get_checkpoint(order, contact);
            // ---
            if (current_checkpoint !== checkpoint) {
                checkpoint = current_checkpoint;
                html += `</div><span class="checkpoint">${checkpoint}</span><div class="group">`;
            }
            // ---
            html += `<contact-li
                uuid="${contact.uuid}"
                email="${contact.email}"
                nickname="${contact.nickname}"
                search-context="${contact.email}|${contact.nickname}|${contact.uuid}"
            ></contact-li>`;
        }
        this.html_list.innerHTML = html;
    }
}

window.ChatUI = ChatUI;