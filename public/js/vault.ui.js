import { VaultService } from "../service/vault.service.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { date } from "../utils/dateUtils.js";
import { finestra } from "../components/main.components.js";
import { FileUtils } from "../utils/file.utils.js";
import { Search } from "../utils/search.js";

$(document).ready(async () => {
    await VaultUI.init();
    /**
     * CREATE VAULT
     */
    Form.onsubmit("form-create-vault", async (form, elements) => {
        if (!confirm(`Confermi di voler salvare ${elements.T}`)) return;
        // ---
        if (await VaultService.create(elements)) {
            Log.summon(0, `${elements.T} salvato con successo`);
            finestra.close('win-create-vault');
            $(form).trigger("reset");
            VaultUI.init();
        } else {
            Log.summon(2, `Errore durante il salvataggio di ${elements.T}`);
        }
    });
    /**
     * NEW VAULT CUSTOM SECTION
     */
    $('#add-custom-section-new-vault').on('click', () => {
        document.querySelector('#custom-sections-new-vault').innerHTML 
        += 
        `<custom-vault-section input-id="${Date.now()}"></custom-vault-section>`;
    });
    /**
     * UPDATE VAULT CUSTOM SECTION
     */
    $('#add-custom-section-update-vault').on('click', () => {
        document.querySelector('#custom-sections-update-vault').innerHTML 
        += 
        `<custom-vault-section input-id="${Date.now()}"></custom-vault-section>`;
    });
    /**
     * UPDATE VAULT
     */
    Form.onsubmit("form-update-vault", async (form, elements) => {
        if (!confirm(`Confermi di voler modificare ${elements.T}`)) return;
        // ---
        const { vault_id } = elements;
        delete elements.vault_id;
        // ---
        if (await VaultService.update(vault_id, elements)) {
            Log.summon(0, `${elements.T} modificato con successo`);
            finestra.close('win-update-vault');
            $(form).trigger("reset");
            VaultUI.init();
        } else {
            Log.summon(2, `Errore durante la modifica di ${elements.T}`);
        }
    });
    /**
     * ON CLICK VAULT-LI UPDATE
     */
    $('#vaults-list').on('click', 'vault-li', (e) => {
        const id = $(e.currentTarget).attr('id');
        finestra.open('win-update-vault');
        // --
        const vault = VaultService.get_vault(id);
        // -- riempio i campi
        document.querySelector('#vault-title-to-update').textContent = vault.secrets.T;
        document.querySelector('#update-vault-id').value = id;
        document.querySelector('#btn-delete-vault').setAttribute('vault-id', id);
        document.querySelector('#update-titolo').value = vault.secrets.T;
        document.querySelector('#update-username').value = vault.secrets.U;
        document.querySelector('#update-password').value = vault.secrets.P;
        document.querySelector('#update-note').value = vault.secrets.N;
        document.querySelector('#update-created-date').textContent = date.format("%j %M %Y at %H:%i", new Date(vault.createdAt));
        document.querySelector('#update-last-modified-date').textContent = date.format("%j %M %Y at %H:%i", new Date(vault.updatedAt));
        // -- customs
        const custom_container = document.querySelector('#custom-sections-update-vault');
        custom_container.innerHTML = '';
        let i = 0;
        for (const secret in vault.secrets) {
            if (secret.length === 1) continue;
            // ---
            custom_container.innerHTML += 
            `<custom-vault-section input-id="${`${Date.now()}.${i}`}" section-name="${secret}" input-value="${vault.secrets[secret]}"></custom-vault-section>`; 
            i++;
        }
    });
    /**
     * SYNCRONIZE VAULT
     */
    $('#btn-sync-vault').on('click', async () => {
        if (!confirm('Confermi di volerti sincronizzare con il server?')) return;
        // ---
        await VaultService.syncronize(true);
        VaultUI.html_vaults(VaultService.vaults);
        VaultUI.html_used_usernames(VaultService.used_usernames);
    });
    /**
     * DELETE VAULT
     */
    $('#btn-delete-vault').on('click', async (e) => {
        const vault_id = e.target.getAttribute('vault-id');
        const vault = await VaultService.get_vault(vault_id);
        const title = vault.secrets.T;
        if (!confirm(`Confermi di voler eliminare ${title}?`)) return;
        // ---
        if (await VaultService.delete(vault_id)) {
            Log.summon(0, `${title} eliminato con successo`);
            finestra.close('win-update-vault');
            VaultUI.init();
        } else {
            Log.summon(2, `Errore durante l'eliminazione di ${title}`);
        }
    });
    /**
     * GENERATE RECOVERY CODE
     */
    Form.onsubmit('form-new-recovery-code', async (form, elements) => {
        const { password } = elements;
        // -- verifico la password dell'utente
        if (!(await AuthService.verify_master_password(password))) {
            Log.summon(2, "Password isn't correct");
            return;
        }
        // ---
        const code = await AuthService.generate_recovery_code(password);
        // ---
        if (code) {
            Log.summon(0, "Recovery code generated successfully");
            navigator.clipboard.writeText(code);
            Log.summon(3, "Recovery code has been copied on your clipboard");
            FileUtils.download('Recovery Code', 'txt', code);
            $(form).trigger('reset');
        }
    });
    /**
     * SEARCH VAULT
     */
    $('#search-vault').on('keyup', (e) => {
        VaultUI.search.tabella(
            document.getElementById('search-vault'),
            'vaults-list',
            'vault-li'
        );
    });
});

export class VaultUI {
    static search = new Search();
    static async init(full = false) {
        const inizialized = await VaultService.syncronize(full);
        if (inizialized !== true) return;
        // ---
        this.html_vaults(VaultService.vaults);
        this.html_used_usernames(VaultService.used_usernames);
    }
    /**
     * This function generates HTML markup for a list of vaults.
     * @param {Array} vaults - An array of vault objects. Each vault object should have properties: T (title), updatedAt (date of last update).
     */
    static html_vaults(vaults) {
        let html = "";
        for (const vault of vaults) {
            html += `<vault-li 
            title="${vault.secrets.T}"
            updated-at="${date.format("%d %M %Y", new Date(vault.updatedAt))}"
            secure="true"
            id="${vault.id}"
        ></vault-li>`;
        }
        document.querySelector("#vaults-list").innerHTML = html;
    }
    /**
     * Carica gli username utilizzati dall'utente sul datalist
     * @param {Set} used_usernames 
     */
    static html_used_usernames(used_usernames) {
        let options = '';
        for (const username of used_usernames) {
            options += `<option value="${username}"></option>`;
        }
        document.querySelector('#used-username').innerHTML = options;
    }
}
