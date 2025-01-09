import { VaultService } from "../service/vault.service.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { date } from "../utils/dateUtils.js";
import { Windows } from "../utils/windows.js";
import { Search } from "../utils/search.js";
import { ptg } from "../utils/ptg.js";
import { SessionStorage } from "../utils/session.js";
import { DeviceUI } from "./device.ui.js";
import { LocalStorage } from "../utils/local.js";
import { PasskeyUI } from "./passkey.ui.js";

$(document).ready(async () => {
    if (window.location.pathname !== '/vault') return;
    await VaultUI.init();
    /**
     * CREATE VAULT
     */
    Form.onsubmit("form-create-vault", async (form, elements) => {
        if (!confirm(`Have you entered everything for ${elements.T}`)) return;
        // ---
        Windows.loader(true);
        if (await VaultService.create(elements)) {
            Log.summon(0, `${elements.T} saved`);
            Windows.close('win-create-vault');
            $(form).trigger("reset");
            document.getElementById('custom-sections-new-vault').innerHTML = '';
            setTimeout(() => {
                VaultUI.init_db_dom();
            }, 1000);
        } else {
            Log.summon(2, `Error while saving ${elements.T}`);
        }
        Windows.loader(false);
    });
    /**
     * NEW VAULT CUSTOM SECTION
     */
    $('#add-custom-section-new-vault').on('click', () => {
        // -- memorizzo i dati degli input precedenti
        document.querySelectorAll('custom-vault-section input').forEach((e) => {
            e.setAttribute("value", e.value);
        });
        // ---
        const section = document.createElement('custom-vault-section');
        section.setAttribute('input-id', Date.now());
        section.setAttribute('paste', 'true');
        document.querySelector('#custom-sections-new-vault').appendChild(section);
    });
    /**
     * UPDATE VAULT CUSTOM SECTION
     */
    $('#add-custom-section-update-vault').on('click', () => {
        // -- memorizzo i dati degli input precedenti
        document.querySelectorAll('custom-vault-section input').forEach((e) => {
            e.setAttribute("value", e.value);
        });
        // ---
        const section = document.createElement('custom-vault-section');
        section.setAttribute('input-id', Date.now());
        section.setAttribute('paste', 'true');
        document.querySelector('#custom-sections-update-vault').appendChild(section);
    });
    /**
     * UPDATE VAULT
     */
    Form.onsubmit("form-update-vault", async (form, elements) => {
        if (!confirm(`Do you confirm that you want to edit ${elements.T}`)) return;
        // ---
        const { vault_id } = elements;
        delete elements.vault_id;
        // ---
        Windows.loader(true);
        // ---
        if (await VaultService.update(vault_id, elements)) {
            Log.summon(0, `${elements.T} edited`);
            Windows.close('win-update-vault');
            $(form).trigger("reset");
            setTimeout(() => {
                VaultUI.init_db_dom();
            }, 1000);
        } else {
            Log.summon(2, `Errore durante la modifica di ${elements.T}`);
        }
        Windows.loader(false);
    });
    /**
     * ON CLICK VAULT-LI UPDATE
     */
    const update_elements = {
        win_title: document.querySelector('#vault-title-to-update'),
        vault_id: document.querySelector('#update-vault-id'),
        delete_btn: document.querySelector('#btn-delete-vault'),
        title: document.querySelector('#update-titolo'),
        username: document.querySelector('#update-username'),
        password: document.querySelector('#update-password'),
        note: document.querySelector('#update-note'),
        created_date: document.querySelector('#update-created-date'),
        last_modified_date: document.querySelector('#update-last-modified-date'),
        psw_strength_bar: document.querySelector('#update-psw-strength-bar'),
    }
    $('#vaults-list').on('click', 'vault-li', (e) => {
        const id = $(e.currentTarget).attr('id');
        Windows.open('win-update-vault');
        // --
        const vault = VaultService.get_vault(id);
        const strength_value = ptg.test(vault.secrets.P).average;
        // -- riempio i campi
        update_elements.win_title.textContent = vault.secrets.T;
        update_elements.vault_id.value = id;
        update_elements.delete_btn.setAttribute('vault-id', id);
        update_elements.title.value = vault.secrets.T;
        update_elements.username.value = vault.secrets.U;
        update_elements.password.value = vault.secrets.P;
        update_elements.note.value = vault.secrets.N;
        update_elements.created_date.textContent = date.format("%j %M %Y at %H:%i", new Date(vault.createdAt));
        update_elements.last_modified_date.textContent = date.format("%j %M %Y at %H:%i", new Date(vault.updatedAt));
        update_elements.psw_strength_bar.setAttribute('value', strength_value);
        // -- customs
        const custom_container = document.querySelector('#custom-sections-update-vault');
        custom_container.innerHTML = '';
        let i = 0;
        for (const secret in vault.secrets) {
            if (secret.length === 1) continue;
            // ---
            custom_container.innerHTML += 
            `<custom-vault-section input-id="${`${Date.now()}.${i}`}" section-name="${secret}" input-value="${vault.secrets[secret]}" paste="false"></custom-vault-section>`; 
            i++;
        }
    });
    /**
     * SYNCRONIZE VAULT
     */
    $('#btn-sync-vault').on('click', async () => {
        if (!confirm('Do you confirm that you want to synchronize with the server?')) return;
        // ---
        Windows.loader(true);
        await VaultService.syncronize(true);
        Windows.loader(false);
        VaultUI.html_vaults(VaultService.vaults);
        VaultUI.html_used_usernames(VaultService.used_usernames);
    });
    /**
     * DELETE VAULT
     */
    $('#btn-delete-vault').on('click', async (e) => {
        const vault_id = e.currentTarget.getAttribute('vault-id');
        const vault = VaultService.get_vault(vault_id);
        const title = vault.secrets.T;
        if (!confirm(`Are you sure you want to delete permanently ${title}?`)) return;
        // ---
        Windows.loader(true);
        // ---
        if (await VaultService.delete(vault_id)) {
            Log.summon(0, `${title} deleted`);
            Windows.close('win-update-vault');
            VaultUI.init_db_dom();
        } else {
            Log.summon(2, `Error while deleting ${title}`);
        }
        Windows.loader(false);
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
    /**
     * PASSWORD GENERATOR
     */
    const psw_gen_test = document.getElementById('psw-generator-tester');
    $('#psw-gen-len').on('input', (e) => {
        document.getElementById('psw-gen-length-indicator').textContent = e.currentTarget.value;
    });
    
    Form.onsubmit('form-psw-gen', (form, elements) => {
        const { length, az, AZ, _09, _$ } = elements;
        try {
            const password = ptg.generate(length, az, AZ, _09, _$);
            const test = ptg.test(password).average;
            psw_gen_test.innerHTML = ptg.colorize_text(password);
            document.getElementById('psw-gen-str-bar').setAttribute('value', test);
        } catch (error) {
            Log.summon(3, "Error while generating new password");
        }
    });
    /**
     * Ordinamento
     */
    $('.order-vaults').on('click', (e) => {
        const btn = e.currentTarget;
        const order = btn.getAttribute('order');
        const active = JSON.parse(btn.getAttribute('active'));
        btn.setAttribute('active', !active);
        const curr_order = 
            order == 'az' ? 
                active ? 'az' : 'za'
                :
                order == 'date' ? 
                    active ? 'dateup' : 'datedown' : null;
        // ---
        if (!curr_order) return;
        VaultUI.html_vaults(VaultService.vaults, curr_order);
    });
    /**
     * Vista dei vault
     */
    const vaults_grid = document.getElementById('vaults-list');
    let vaults_view_active = await LocalStorage.get('vaults-view') ?? false;
    if (vaults_view_active) vaults_grid.classList.toggle('list');
    $('.vaults-view').on('click', () => {
        vaults_grid.classList.toggle('list');
        // ---
        vaults_view_active = !vaults_view_active;
        LocalStorage.set('vaults-view', vaults_view_active);
    })
});

export class VaultUI {
    static search = new Search();
    /**
     * inizializza tutto il necessario per avviare il vault se possibile
     */
    static async init() {
        // - controllo se è possibile usare il vault configurando i segreti
        const configured = await VaultService.config_secrets();
        let timeout = 0;
        // -- se non ci sono provo ad avviare la sessione
        if (!configured) {
            Windows.loader(true);
            const started = await AuthService.start_session();
            // --- se non viene avviata fermo e restituisco errore
            if (started !== true && started !== 0) {
                Log.summon(2, "Authentication failed, you will be redirected to the sign-in page");
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 4000);
                return false;
            }
            // --- se la sessione viene avviata, eseguo init_db_dom() e avvio il vault
            timeout = 1000;
        }
        // -- se ci sono avvio il vault
        setTimeout(() => {
            // ---
            this.init_db_dom();
            DeviceUI.init();
            PasskeyUI.init();
            // ---
            Windows.loader(false);
            if (timeout > 0) Log.summon(0, `Welcome back ${SessionStorage.get('email')}`);
        }, timeout);
    }
    /**
     * Inizializza il vault e il dom
     * @param {boolean} full sincronizzazione completa con il db
     */
    static async init_db_dom(full = false) {
        const inizialized = await VaultService.syncronize(full);
        if (inizialized !== true) return;
        // ---
        this.html_vaults(VaultService.vaults);
        this.html_used_usernames(VaultService.used_usernames);
    }
    /**
     * funzioni di ordinamento
     */
    static order_functions = {
        'az': (a, b) => a.secrets.T.localeCompare(b.secrets.T),
        'za': (a, b) => b.secrets.T.localeCompare(a.secrets.T),
        'dateup': (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
        'datedown': (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    }
    /**
     * This function generates HTML markup for a list of vaults.
     * @param {Array} vaults - An array of vault objects. Each vault object should have properties: T (title), updatedAt (date of last update).
     * @param {string} order - az, za, dateup, datedown, secureup, securedown
     */
    static html_vaults(vaults, order = 'az') {
        let html = ``;
        const get_checkpoint = (order, vault) => {
            return order === 'az' || order === 'za' ?
                vault.secrets.T[0].toUpperCase() :
                date.format('%M %y', new Date(vault.updatedAt))
        }
        // -- ordino
        const order_function = this.order_functions[order];
        vaults.sort(order_function);
        // ---
        let checkpoint = get_checkpoint(order, vaults[0]);
        html += `<span class="checkpoint">${checkpoint}</span><div class="group">`;
        for (const vault of vaults) {
            const strength_value = ptg.test(vault.secrets.P).average;
            const current_checkpoint = get_checkpoint(order, vault);
            // ---
            if (current_checkpoint !== checkpoint) {
                checkpoint = current_checkpoint;
                html += `</div><span class="checkpoint">${checkpoint}</span><div class="group">`;
            }
            // ---
            html += `<vault-li 
            title="${vault.secrets.T}"
            updated-at="${date.format("%j %M %y", new Date(vault.updatedAt))}"
            secure="${strength_value > 60}"
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

window.VaultUI = VaultUI;