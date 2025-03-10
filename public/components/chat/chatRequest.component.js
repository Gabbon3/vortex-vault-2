import { ChatService } from "../../service/chat.service.js";
import { Bus } from "../../utils/eventBus.js";
import { Log } from "../../utils/log.js";

class ChatRequest extends HTMLElement {
    constructor() {
        super();
        this.uuid = null;
        this.email = null;
    }

    render() {
        const uuid = this.getAttribute("uuid");
        this.uuid = uuid;
        const email = this.getAttribute("email");
        this.email = email;
        this.className = "isle bg-3 flex gap-50 d-row y-center";
        // -- variabili
        const icon = `<span class="material-symbols-rounded">person</span>`;
        const h3 = `<span>${email}</span>`;
        const acceptBtn = `<button class="btn primary last" title="Accept"><span class="material-symbols-rounded">check</span></button>`;
        const ignoreBtn = `<button class="btn danger" title="Ignore"><span class="material-symbols-rounded">delete</span></button>`;
        // -- html
        this.innerHTML = `${icon}${h3}${acceptBtn}${ignoreBtn}`;
        // -- eventi
        // - ACCETTA RICHIESTA
        this.querySelector(".btn.primary").addEventListener("click", async (e) => {
            const accepted = await ChatService.acceptChat(this.uuid, this.email);
            if (!accepted) return Log.summon(1, "Something went wrong.");
            // ---
            Log.summon(0, `Chat accepted successfully`);
            this.remove();
        });
        // - IGNORA RICHIESTA
        this.querySelector(".btn.danger").addEventListener("click", (e) => {
            ChatService.ignoreRequest(this.uuid);
            Log.summon(1, `Chat ignored`);
            this.remove();
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("chat-request", ChatRequest);