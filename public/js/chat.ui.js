import { ChatService } from "../chatmodule/chat.service.js";
import { date } from "../utils/dateUtils.js";
import { Form } from "../utils/form.js";
import { Search } from "../utils/search.js";
import { Bus, notify } from "../utils/eventBus.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { UUID } from "../utils/uuid.js";

window.ChatService = ChatService;
window.UUID = UUID;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await ChatService.init();
        ChatUI.init_html();
        ChatUI.html_contacts();
        ChatUI.htmlChatRequests();
    } catch (error) {
        Log.summon(2, error.message);
    }
    /**
     * Send Chat Request
     */
    Form.onsubmit("form-search-user", async (form, elements) => {
        const { email } = elements;
        const result = await ChatService.searchUser(email);
        if (result) {
            ChatUI.htmlSearchResults(result, email);
            form.reset();
        }
        if (result.length === 0) Log.summon(3, 'No user found.');
    });
    /**
     * Invio messaggio
     */
    Form.onsubmit(ChatUI.messageForm, async (form, elements) => {
        const { msg } = elements;
        const message = msg.trim();
        if (message === '') return;
        const ID = await ChatService.sendMessage(ChatService.activeChatUuid, message);
        ChatUI.appendMessage(ID, message, Date.now(), true);
        form.reset();
        ChatUI.messageTextarea.rows = 1;
    });
    /**
     * SEARCH VAULT
     */
    document.querySelector('#search-contact').addEventListener('keyup', (e) => {
        ChatUI.search.tabella(
            e.currentTarget,
            'contacts-list',
            'contact-li'
        );
    });
    /**
     * Resize automatico della textarea
     */
    ChatUI.messageTextarea.addEventListener('input', () => {
        const newRowsCount = ChatUI.messageTextarea.value.split('\n').length;
        if (newRowsCount >= ChatUI.maxMessageRows) return;
        ChatUI.messageTextarea.rows = newRowsCount;
    });
    /**
     * Premendo Ctrl + Invio, invia il form
     */
    ChatUI.messageTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ChatUI.messageForm.requestSubmit();
        }
    });
    /**
     * Ordinamento Contatto
     */
    document.querySelectorAll('.order-contacts').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const order = btn.getAttribute('order');
            const active = JSON.parse(btn.getAttribute('active'));
            btn.setAttribute('active', !active);
            const curr_order =
                order === 'az'
                    ? active ? 'az' : 'za'
                    : order === 'date'
                        ? active ? 'dateup' : 'datedown'
                        : null;
            if (!curr_order) return;
            ChatUI.current_order = curr_order;
            ChatUI.html_contacts(curr_order);
        });
    });
    /**
     * Pulsante elimina chat
     */
    document.querySelector('#btn-toggle-chat-delete').addEventListener('click', (e) => {
        /**
         * @type {HTMLElement}
         */
        const btn = e.currentTarget;
        const isEnabled = btn.classList.contains('danger');
        ChatUI.isDeletingChat = !isEnabled;
        // ---
        btn.className = 'btn ' + (isEnabled ? 'secondary' : 'danger');
        ChatUI.contactListContainer.classList.toggle('is-deleting');
        document.querySelector('#chat-delete-alert').style.display = isEnabled ? 'none' : '';
    });
    /**
     * Pulsante impostazioni chat
     */
    document.querySelector('#chat-settings').addEventListener('click', () => {
        Windows.open('win-contact-manager');
        // -- altre azioni magari potrebbero servire in futuro
    });
    /**
     * Pulizia chat di tutti i messaggi
     */
    document.querySelector('#btn-clear-chat-messages').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete all messages from this chat?')) return;
        // ---
        await ChatUI.clearChat();
    });
    /**
     * Elimina chat dal Contact Manager
     */
    document.querySelector('#btn-delete-chat').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this chat?')) return;
        // ---
        const deleted = ChatService.deleteContact();
        if (deleted) Windows.close('win-contact-manager');
    });
    /**
     * Nuovo messaggio arrivato
     */
    Bus.addEventListener("new-message", (event) => {
        const { ID, message, sender, timestamp, nickname } = event.detail;
        // -- invio una notifica con il browser
        notify(nickname, message);
        if (sender !== ChatService.activeChatUuid) return;
        // -- stampo il messaggio
        ChatUI.appendMessage(ID, message, timestamp, false);
    });
    /**
     * Nuova richiesta arrivata
     */
    Bus.addEventListener("new-chat-request", (event) => {
        const { from, email, timestamp } = event.detail;
        // -- invio una notifica con il browser
        notify('New chat request', `You received a chat request from ${email}`);
        Log.summon(3, 'New chat request, click here to check it.', () => {
            Windows.open('win-contacts');
            document.getElementById('cont-crl').style.display = '';
        });
        ChatUI.htmlChatRequests();
    });
    /**
     * Chat stabilita con successo
     */
    Bus.addEventListener("chat-established", () => {
        // -- invio una notifica con il browser
        notify('Chat established', '🔐 Secure chat successfully established.');
        ChatUI.html_contacts();
    });
    /**
     * Chat stabilita con successo
     */
    Bus.addEventListener("chat-deleted", () => {
        // -- invio una notifica con il browser
        notify('Chat deleted', '🗑️ Chat deleted.');
        Log.summon(1, 'Chat deleted.');
        ChatUI.html_contacts();
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
    /**
     * Textare dove scrivi il messaggio
     * @type {HTMLElement}
     */
    static messageTextarea = null;
    static maxMessageRows = 7;
    /**
     * Form per l'invio dei messaggi
     * @type {HTMLElement}
     */
    static messageForm = null;
    /**
     * Container dei contatti
     * @type {HTMLElement}
     */
    static contactListContainer = null;
    /**
     * Container dei messaggi
     * @type {HTMLElement}
     */
    static messages = null;
    static current_order = "az";
    static chatContactName = null;
    static contactManagerCurrentUuid = null;
    static isDeletingChat = false;
    /**
     * Inizializza gli elementi html utili al funzionamento
     */
    static init_html() {
        if (this.html_initialized) return;
        // -- verifico se ce il permesso per le notifiche
        if ('Notification' in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
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
        this.contactListContainer = document.getElementById("contacts-list");
        // -- container della chat
        this.messages = document.getElementById("messages");
        // ---
        this.messageTextarea = document.querySelector('#message-textarea');
        // ---
        this.messageForm = document.querySelector('#send-message');
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
            const contact = ChatService.contacts.get(ChatService.activeChatUuid);
            contact.nickname = newNickname;
            // -- salvo i contatti nuovamente in locale
            ChatService.contacts.set(ChatService.activeChatUuid, contact);
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
    static async openChat(uuid) {
        const contact = ChatService.contacts.get(uuid);
        if (!contact) return;
        const chat = await ChatService.openChat(uuid);
        if (!chat) return;
        // -- preparo l'html da stampare per i messaggi
        const messages = await ChatService.getMessages();
        const html = this.htmlChat(messages);
        this.messages.innerHTML = html;
        this.chatContactName.textContent = contact.nickname ?? contact.uuid;
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    /**
     * Eliminazione chat
     */
    static async clearChat() {
        const uuid = ChatService.activeChatUuid;
        // ---
        const clear = await ChatService.clearChat(uuid);
        if (!clear) return Log.summon(1, 'Something went wrong during chat cleaning.');
        // ---
        Log.summon(0, 'Successful clean chat.');
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
            const { id: ID, msg } = messages[i];
            const [message, timestamp, self] = msg;
            html += this.htmlMessage(ID, message, timestamp, self);
        }
        return html;
    }
    /**
     * Appende un messaggio nella chat html
     * @param {string} ID -
     * @param {string} message -
     * @param {Date} timestamp -
     * @param {boolean} self - true se il messaggio è dell'utente corrente, false di un contatto
     */
    static appendMessage(ID, message, timestamp, self) {
        this.messages.innerHTML += this.htmlMessage(ID, message, timestamp, self);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    /**
     * Restituisce il codice html di un messaggio
     * @param {string} ID 
     * @param {*} message
     * @param {number} timestamp - data in millisecondi
     * @param {boolean} self
     * @returns
     */
    static htmlMessage(ID, message, timestamp, self) {
        return `<message-g id="${ID}" self="${self}" msg="${message}" timestamp="${timestamp}"></message-g>`;
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
        if (contactsList.length === 0) return (this.contactListContainer.innerHTML = "");

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
        this.contactListContainer.innerHTML = html;
    }

    /**
     * Genera l'html per le richieste di chat
     */
    static htmlChatRequests() {
        if (Object.entries(ChatService.incomingChatRequests).length === 0) return;
        // ---
        let html = '';
        for (const uuid in ChatService.incomingChatRequests) {
            const request = ChatService.incomingChatRequests[uuid];
            html += `<chat-request uuid="${uuid}" email="${request.email}" timestamp="${request.timestamp}"></chat-request>`;
        }
        document.querySelector('#cont-requests-list').innerHTML = html;
    }
    
    /**
     * Genera l'html per i risultati della ricerca degli utenti
     * @param {Array} results 
     * @param {string} search - la ricerca effettuata
     */
    static htmlSearchResults(results, search) {
        let html = results.length > 0 ? '<hr>' : '';
        for (const user of results) {
            html += `<user-result uuid="${user.id}" email="${user.email}" search="${search}"></user-result>`;
        }
        document.getElementById('search-user-results').innerHTML = html;
    }
}

window.ChatUI = ChatUI;