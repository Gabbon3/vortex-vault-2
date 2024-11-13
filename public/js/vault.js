import { VaultBusiness } from "../business/vault.business.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { date } from "../utils/dateUtils.js";
import { finestra } from "../components/main.components.js";

$(document).ready(async () => {
    await VaultUI.init();
    /**
     * CREATE VAULT
     */
    Form.onsubmit("form-create-vault", async (form, elements) => {
        if (!confirm(`Confermi di voler salvare ${elements.T}`)) return;
        // ---
        if (await VaultBusiness.create(elements)) {
            Log.summon(0, `${elements.T} salvato con successo`);
            $(form).trigger("reset");
        } else {
            Log.summon(2, `Errore durante il salvataggio di ${elements.T}`);
        }
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
        if (await VaultBusiness.update(vault_id, elements)) {
            Log.summon(0, `${elements.T} modificato con successo`);
            $(form).trigger("reset");
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
        const vault = VaultBusiness.get_vault(id);
        // -- riempio i campi
        document.querySelector('#vault-title-to-update').textContent = vault.secrets.T;
        document.querySelector('#update-vault-id').value = id;
        document.querySelector('#update-titolo').value = vault.secrets.T;
        document.querySelector('#update-username').value = vault.secrets.U;
        document.querySelector('#update-password').value = vault.secrets.P;
        document.querySelector('#update-note').value = vault.secrets.N;
    });
});

window.Form = Form;

class VaultUI {
    static async init() {
        const inizialized = await VaultBusiness.init();
        if (inizialized !== true) return;
        // ---
        this.html_vaults(VaultBusiness.vaults);
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
            updated-at="${date.format("%d-%m-%Y", new Date(vault.updatedAt))}"
            secure="true"
            id="${vault.id}"
        ></vault-li>`;
        }
        document.querySelector("#vaults-list").innerHTML = html;
    }
}
