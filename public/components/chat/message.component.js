import { ChatService } from "../../chatmodule/chat.service.js";
import { date } from "../../utils/dateUtils.js";

class MessageElement extends HTMLElement {
    static recent = null;

    constructor() {
        super();
        this.uuid = null;
    }

    render() {
        const msg = this.innerHTML;
        this.uuid = this.getAttribute('id');
        const self = JSON.parse(this.getAttribute('self'));
        const timestamp = new Date(Number(this.getAttribute('timestamp')));
        // -- html
        this.innerHTML = `<div class="container ${self ? 'self' : ''}"><p>${msg}</p><span>${date.format("%H:%i", timestamp)}</span></div>`;
        // ---
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("message-g", MessageElement);