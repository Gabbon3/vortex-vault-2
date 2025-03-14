import { HtmlSecretsRender } from "../js/html_secrets_render.js";
import { VaultUI } from "../js/vault.ui.js";
import { VaultService } from "../service/vault.service.js";
import { Windows } from "../utils/windows.js";
import { date } from "../utils/dateUtils.js";

class VaultLi extends HTMLElement {
    constructor() {
        super();
        this.uuid = null;
    }

    connectedCallback() {
        // -- ottengo gli attributi
        const id = this.getAttribute('id');
        this.uuid = id;
        const title = this.getAttribute("title");
        const updated_at = this.getAttribute("updated-at");
        const secure = this.getAttribute("secure") === "true";
        const st = this.getAttribute("st");
        /**
         * vault: 0 verde/rosso
         * note: 1 azzurro
         * card: 2 giallo
         * chiavi pubbliche: 3 viola
         */
        let icon = '';
        let color = '';
        color = HtmlSecretsRender.get_color(st);
        switch (st) {
            case '0':
                icon = secure ? 'key_vertical' : 'warning';
                color = secure ? color : 'red';
                break;
            case '1':
                icon = 'sticky_note_2';
                break;
            case '2':
                icon = 'credit_card';
                break;
            case '3':
                icon = 'key_vertical';
                break;
        }
        if (st === '3') {
            icon = `<div class="flex">
                <span class="material-symbols-rounded trans rotate _180">key_vertical</span>
                <span class="material-symbols-rounded" style="margin-left: -15px;">key_vertical</span>
            </div>`;
        } else {
            icon = `<span class="material-symbols-rounded">${icon}</span>`;
        }
        // ---
        this.innerHTML = `
            <div class="simbolo ${color}">
                ${icon}
            </div>
            <div class="info">
                <strong>${title}</strong>
                <i>${updated_at}</i>
            </div>
        `;
    }
}

customElements.define("vault-li", VaultLi);