import { ChatUI } from "../../js/chat.ui.js";
import { ChatService } from "../../chatmodule/chat.service.js"; 
import { Windows } from "../../utils/windows.js";

class ContactElement extends HTMLElement {
    constructor() {
        super();
        this.uuid = null;
    }

    render() {
        const uuid = this.getAttribute("uuid");
        this.setAttribute('title', uuid);
        this.uuid = uuid;
        // --
        const contact = ChatService.contacts.get(uuid);
        
        // -- variabili
        const icon = `<span class="material-symbols-rounded">person</span>`;
        const color = ["red", "yellow", "green", "orange", "peach", "purple", "pink", "mint", "blue", "lightblue", "olivegreen"][Math.floor(Math.random() * 11)];
        // -- html
        this.innerHTML = 
       `<div class="simbolo ${color}">
            ${icon}
        </div>
        <div class="info">
            <strong>${contact.nickname === "" ? uuid : contact.nickname}</strong>
            <i>${contact.email}</i>
        </div>`;
        // -- eventi
        this.addEventListener("click", (e) => {
            if (ChatUI.isDeletingChat) this.deleteChat(e)
            else this.openChat();
        });
    }

    openChat() {
        ChatUI.openChat(this.uuid);
        ChatUI.activeChatUuid = this.uuid;
        Windows.open('win-chat');
    }

    deleteChat(e) {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this contact?')) return;
        // ---
        ChatService.deleteContact(this.uuid);
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("contact-li", ContactElement);