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
import { HtmlSecretsRender } from "./html_secrets_render.js";

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname !== '/vault') return;
    // ---
    await VaultUI.init();
    // add
    const create_dinamic_secrets = document.getElementById('dinamic-secrets');
    // update
    const secrets_type_input = document.getElementById('secrets-type');
    const update_secrets_type_input = document.getElementById('update-secrets-type');
    const update_dinamic_secrets = document.getElementById('update-dinamic-secrets');
    // windows
    const win_create_vault = document.getElementById('win-create-vault');
    const title_create_vault = document.getElementById('create-vault-title');
    const icon_create_vault = document.getElementById('create-vault-icon');
    // const win_update_vault = document.getElementById('win-update-vault');
    const addButtonListeners = () => {
        const config = [
            { id: 'btn-add-vault', type: 0, render: HtmlSecretsRender.vault, color: 'orange', title: "New Login" },
            { id: 'btn-add-note', type: 1, render: HtmlSecretsRender.note, color: 'lightblue', title: "New Note" },
            { id: 'btn-add-card', type: 2, render: HtmlSecretsRender.credit_card, color: 'yellow', title: "New Card" },
            { id: 'btn-add-asimmetric', type: 3, render: HtmlSecretsRender.public_key, color: 'purple', title: "New Asymmetric keys" },
        ];
        // -- aggiungo i listeners
        config.forEach(({ id, type, render, color, title }) => {
            document.getElementById(id).addEventListener('click', () => {
                secrets_type_input.value = type;
                create_dinamic_secrets.innerHTML = render();
                win_create_vault.setAttribute('class', 'window m pr show ' + color);
                title_create_vault.textContent = title;
                icon_create_vault.innerHTML = HtmlSecretsRender.get_html_icon(type);
                VaultUI.html_used_usernames();
            });
        });
    };
    addButtonListeners();
    /**
     * Abilita la vista degli elementi se uno solo per categoria o tutti
     */
    VaultUI.btn_category.addEventListener('click', (e) => {
        VaultUI.view_indicator = VaultUI.view_indicator + 1 > 3 ? -1 : VaultUI.view_indicator + 1;
        // -- colore pulsante per mostrare tramite la ui la vista corrente
        const color = HtmlSecretsRender.get_color(VaultUI.view_indicator) ?? 'secondary';
        VaultUI.btn_category.setAttribute('class', `btn ${color}`);
        VaultUI.html_vaults();
    });
    /**
     * CREATE VAULT
     */
    Form.onsubmit("form-create-vault", async (form, elements) => {
        if (!confirm(`Have you entered everything for ${elements.T}`)) return;
        // ---
        Windows.loader(true);
        const vault_id = await VaultService.create(elements);
        if (vault_id) {
            create_dinamic_secrets.innerHTML = '';
            Log.summon(0, `${elements.T} saved.`);
            Windows.close('win-create-vault');
            $(form).trigger("reset");
            await VaultUI.init_db_dom();
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
        document.querySelector('#custom-sections-vault').appendChild(section);
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
        document.querySelector('#update-custom-sections-vault').appendChild(section);
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
        const updated = await VaultService.update(vault_id, elements);
        if (updated) {
            Log.summon(0, `${elements.T} edited`);
            Windows.close('win-update-vault');
            $(form).trigger("reset");
            await VaultUI.init_db_dom();
        } else {
            Log.summon(2, `Errore durante la modifica di ${elements.T}`);
        }
        Windows.loader(false);
    });
    /**
     * ON CLICK VAULT-LI UPDATE (LOAD VIEW)
     */
    $('#vaults-list').on('click', 'vault-li', (e) => {
        const id = $(e.currentTarget).attr('id');
        Windows.open('win-update-vault');
        // --
        const vault = VaultService.get_vault(id);
        // -- imposto il vault id nel pulsante elimina
        document.getElementById('btn-delete-vault').setAttribute('vault-id', id);
        // -- ottengo il Secret Type
        const ST = vault.secrets.ST ?? 0;
        update_secrets_type_input.value = ST;
        // -- imposto il colore della finestra
        const color = HtmlSecretsRender.get_color(ST);
        document.getElementById('win-update-vault').setAttribute('class', 'window m show ' + color);
        // -- genero l'html
        update_dinamic_secrets.innerHTML = HtmlSecretsRender.get_by_type(ST, vault.secrets);
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
        VaultUI.html_vaults();
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
        VaultUI.current_order = curr_order;
        VaultUI.html_vaults(curr_order);
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
    static view_indicator = -1; // usata per mostrare tutte o alcune categorie di segreti
    static current_order = 'az';
    static html_list = null;
    // cache per salvare i dati scritti nella finestra CREATE
    // static create_cache = { login: null, note: null, card: null, keys: null };
    // pulsante categoria
    static btn_category = null;
    static vault_counter_element = null;
    // ---
    static html_initialized = false;
    /**
     * Inizializza gli elementi html utili al funzionamento
     */
    static init_html() {
        if (this.html_initialized) return;
        this.html_list = document.getElementById("vaults-list");
        this.btn_category = document.getElementById('btn-view-switch');
        this.vault_counter_element = this.btn_category.children[1];
        this.html_initialized = true;
    }
    /**
     * inizializza tutto il necessario per avviare il vault se possibile
     */
    static async init() {
        this.init_html();
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
        this.html_vaults();
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
     * @param {string} order - az, za, dateup, datedown, secureup, securedown
     * @param {number} secret_type_view - indicatore per mostrare solo alcune o tutte le categorie dei vault
     */
    static html_vaults(order = this.current_order, secret_type_view = this.view_indicator) {
        const vaults = VaultService.vaults;
        if (vaults.length === 0) return document.querySelector("#vaults-list").innerHTML = '';
        let html = ``;
        const get_checkpoint = (order, vault) => {
            return order === 'az' || order === 'za' ?
                vault.secrets.T[0].toUpperCase() :
                date.format('%M %y', new Date(vault.updatedAt))
        }
        // -- preparo i vaults da iterare
        const filter_condition = (vault) => { return secret_type_view === -1 || secret_type_view === (vault.secrets.ST ?? 0)};
        const vaults_list = vaults.filter((vault) => filter_condition(vault));
        // -- mostro il numero totale di elementi disponibili
        this.vault_counter_element.textContent = vaults_list.length;
        // -- se non ci sono vault da mostrare termino qui
        if (vaults_list.length === 0) return this.html_list.innerHTML = '';

        // -- ordino
        const order_function = this.order_functions[order];
        vaults_list.sort(order_function);
        // -- gestisco la logica dei checkpoint (lettere o date)
        let checkpoint = get_checkpoint(order, vaults_list[0]);
        html += `<span class="checkpoint">${checkpoint}</span><div class="group">`;
        for (const vault of vaults_list) {
            // -- ottengo il secret type
            const ST = vault.secrets.ST ?? 0;
            // -- skippo il caricamento di questa vista
            // mostro se view === -1 oppure se view === a ST
            if (!(secret_type_view === -1 || secret_type_view === ST)) continue;
            // -- se il tipo è una password
            if (ST === 0) {
                vault.strength_value = ptg.test(vault.secrets.P).average;
            }
            // ---
            const current_checkpoint = get_checkpoint(order, vault);
            // ---
            if (current_checkpoint !== checkpoint) {
                checkpoint = current_checkpoint;
                html += `</div><span class="checkpoint">${checkpoint}</span><div class="group">`;
            }
            // ---
            html += HtmlSecretsRender.get_list_item(ST, vault);
        }
        this.html_list.innerHTML = html;
    }
    /**
     * Carica gli username utilizzati dall'utente sul datalist
     * @param {Set} used_usernames 
     */
    static html_used_usernames(used_usernames = VaultService.used_usernames) {
        let options = '';
        for (const username of used_usernames) {
            options += `<option value="${username}"></option>`;
        }
        document.querySelector('#used-username').innerHTML = options;
    }
}

window.VaultUI = VaultUI;