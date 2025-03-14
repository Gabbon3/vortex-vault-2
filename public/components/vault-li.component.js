import { HtmlSecretsRender } from "../js/html_secrets_render.js";
import { VaultUI } from "../js/vault.ui.js";
import { VaultService } from "../service/vault.service.js";
import { Windows } from "../utils/windows.js";

class VaultLi extends HTMLElement {
    constructor() {
        super();
        this.id = null;
    }

    connectedCallback() {
        // -- ottengo gli attributi
        const id = this.getAttribute('id');
        this.id = id;
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
        // -- eventi
        this.addEventListener('click', (e) => {
            this.openUpdateWindow(e);
        });
    }
    /**
     * 
     * @param {Event} e 
     */
    openUpdateWindow(e) {
        const id = $(e.currentTarget).attr('id');
        Windows.open('win-update-vault');
        // --
        const vault = VaultService.get_vault(id);
        // -- imposto il vault id nel pulsante elimina
        document.getElementById('btn-delete-vault').setAttribute('vault-id', id);
        // -- ottengo il Secret Type
        const ST = vault.secrets.ST ?? 0;
        VaultUI.update_secrets_type_input.value = ST;
        // -- imposto il colore della finestra
        const color = HtmlSecretsRender.get_color(ST);
        document.getElementById('win-update-vault').setAttribute('class', 'window m show maincolor ' + color);
        // -- genero l'html
        VaultUI.update_dinamic_secrets.innerHTML = HtmlSecretsRender.get_by_type(ST, vault.secrets);
        // -- imposto il titolo
        document.getElementById('vault-title-to-update').textContent = vault.secrets.T;
        // -- importo l'id del vault
        document.getElementById('update-vault-id').value = vault.id;
        // -- riempio le date
        document.getElementById('update-created-date').textContent = date.format("%j %M %Y at %H:%i", new Date(vault.createdAt));
        document.getElementById('update-last-modified-date').textContent = date.format("%j %M %Y at %H:%i", new Date(vault.updatedAt));
        // -- riempio i campi custom
        const custom_container = document.getElementById('update-custom-sections-vault');
        custom_container.innerHTML = '';
        let i = 0;
        for (const secret in vault.secrets) {
            if (secret.length === 1 || secret.length === 2) continue;
            // ---
            custom_container.innerHTML += 
            `<custom-vault-section input-id="${`ucs-${i}`}" section-name="${secret}" input-value="${vault.secrets[secret]}" paste="false"></custom-vault-section>`; 
            i++;
        }
    }
}

customElements.define("vault-li", VaultLi);