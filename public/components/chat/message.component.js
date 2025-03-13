import { ChatService } from "../../chatmodule/chat.service.js";
import { date } from "../../utils/dateUtils.js";

class MessageElement extends HTMLElement {
    static recent = null;

    constructor() {
        super();
        this.uuid = null;
    }

    render() {
        this.uuid = this.getAttribute('id');
        const self = JSON.parse(this.getAttribute('self'));
        const msg = this.getAttribute('msg').replaceAll('\n', '<br>');
        const timestamp = new Date(Number(this.getAttribute('timestamp')));
        // -- html
        this.innerHTML = `<div class="container ${self ? 'self' : ''}"><p>${msg}</p><span>${date.format("%H:%i", timestamp)}</span></div>`;
        // -- eventi
        // -- doppio click per eliminare un messaggio
        this.addEventListener('dblclick', async () => {
            if (!confirm('Confirm that you wish to delete this message?')) return;
            const deleted = await ChatService.deleteMessage(this.uuid);
            if (deleted) this.remove();
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("message-g", MessageElement);