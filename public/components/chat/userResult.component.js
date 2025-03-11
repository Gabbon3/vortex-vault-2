import { ChatService } from "../../service/chat.service.js";
import { Log } from "../../utils/log.js";

class UserResult extends HTMLElement {
    constructor() {
        super();
        this.uuid = null;
        this.email = null;
    }

    render() {
        const uuid = this.getAttribute("uuid");
        this.uuid = uuid;
        const email = this.getAttribute("email");
        const search = this.getAttribute("search");
        this.email = email;
        this.className = "isle bg-3 flex gap-50 d-row y-center";
        // -- variabili
        const icon = `<span class="material-symbols-rounded">person</span>`;
        const h3 = `<span>${email.replace(search, `<strong class="color primary">${search}</strong>`)}</span>`;
        const sendRequestBtn = `<button class="btn primary last"><span class="material-symbols-rounded">add</span></button>`;
        // -- html
        this.innerHTML = `${icon}${h3}${sendRequestBtn}`;
        // -- eventi
        this.querySelector("button").addEventListener("click", (e) => {
            const sended = ChatService.requestChat(this.uuid);
            if (!sended) return Log.summon(1, "Something went wrong.");
            // ---
            e.currentTarget.disabled = true;
            Log.summon(0, `Successfully sent the request to '${this.email}'`);
            setTimeout(() => {
                this.remove();
            }, 3000);
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("user-result", UserResult);