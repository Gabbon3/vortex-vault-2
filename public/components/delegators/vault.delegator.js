import { HtmlSecretsRender } from "../../js/html_secrets_render.js";
import { VaultUI } from "../../js/vault.ui.js";
import { VaultService } from "../../service/vault.service.js";
import { date } from "../../utils/dateUtils.js";
import { Windows } from "../../utils/windows.js";

export const VaultDelegator = {
    initialized: false,
    init() {
        if (this.initialized) return;
        this.initialized = true;
        document.addEventListener('click', this.handleClick.bind(this));
    },
    /**
     * Gestisce tutti gli eventi delegatori relativi all'evento Click della pagina Vault
     * @param {Event} e 
     */
    handleClick(e) {
        const handlers = [
            this.handleVaultLiClick,
            this.handleOrdinamentoClick,
        ];
        for (const handler of handlers) {
            if (handler.call(this, e)) break;
        }
    },
    /**
     * 
     * @param {*} e 
     * @returns 
     */
    handleVaultLiClick(e) {
        const vaultElement = e.target.closest("vault-li"); // Trova il messaggio più vicino
        if (!vaultElement) return false;
        // ---
        const id = vaultElement.getAttribute("id");
        Windows.open('win-update-vault');
        // --
        const vault = VaultService.get_vault(id);
        // -- imposto il vault id nel pulsante elimina
        document.getElementById('btn-delete-vault').setAttribute('vault-id', id);
        document.getElementById('update-vault-uuid').textContent = "ID " + id;
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
        return true;
    },
    /**
     * Gestisce i pulsanti 
     * @param {Event} e 
     * @returns {boolean}
     */
    handleOrdinamentoClick(e) {
        const btn = e.target.closest('.order-vaults');
        if (!btn) return;
    
        const order = btn.getAttribute('order');
        const active = JSON.parse(btn.getAttribute('active'));
        btn.setAttribute('active', !active);
    
        let curr_order = null;
        
        if (order === 'az') {
            curr_order = active ? 'az' : 'za';
        } else if (order === 'date') {
            curr_order = active ? 'dateup' : 'datedown';
        }
    
        if (!curr_order) return;
    
        VaultUI.current_order = curr_order;
        VaultUI.html_vaults(curr_order);
    }
};