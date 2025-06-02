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
import { VaultDelegator } from "../components/delegators/vault.delegator.js";

// oggetto usato per memorizzare i dati inseriti nel form di creazione vault
const newVaultsInsertedData = {};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname !== '/vault') return;
    // ---
    if (await AuthService.init()) console.log('SHIV ready');
    await VaultUI.init();
    const addButtonListeners = () => {
        const config = [
            { id: 'btn-add-vault', type: 0, render: HtmlSecretsRender.vault, color: 'orange', title: "New Login" },
            { id: 'btn-add-note', type: 1, render: HtmlSecretsRender.note, color: 'lightblue', title: "New Note" },
            { id: 'btn-add-card', type: 2, render: HtmlSecretsRender.credit_card, color: 'yellow', title: "New Card" },
            { id: 'btn-add-asimmetric', type: 3, render: HtmlSecretsRender.public_key, color: 'purple', title: "New Asymmetric keys" },
            { id: 'btn-add-env', type: 4, render: HtmlSecretsRender.env, color: 'red', title: "New Enviroments" },
            { id: 'btn-add-connection', type: 5, render: HtmlSecretsRender.connection, color: 'peach', title: "New Connection" },
        ];
        // -- aggiungo i listeners
        config.forEach(({ id, type, render, color, title }) => {
            document.getElementById(id).addEventListener('click', () => {
                // -- recupero i vecchi valori
                const oldValues = Form.get_data('form-create-vault');
                newVaultsInsertedData[oldValues.ST] = oldValues;
                // ---
                document.getElementById('secrets-type').value = type;
                document.getElementById('dinamic-secrets').innerHTML = render(newVaultsInsertedData[type] ?? {});
                document.getElementById('win-create-vault').setAttribute('class', 'window m pt show maincolor ' + color);
                document.getElementById('create-vault-title').textContent = title;
                document.getElementById('create-vault-icon').innerHTML = HtmlSecretsRender.get_html_icon(type);
                if (type === 0) VaultUI.html_used_usernames();
            });
        });
    };
    addButtonListeners();
    /**
     * Abilita la vista degli elementi se uno solo per categoria o tutti
     */
    document.getElementById('btn-view-switch').addEventListener('click', (e) => {
        VaultUI.view_indicator = VaultUI.view_indicator + 1 > 5 ? -1 : VaultUI.view_indicator + 1;
        // -- colore pulsante per mostrare tramite la ui la vista corrente
        const color = HtmlSecretsRender.get_color(VaultUI.view_indicator) ?? 'secondary';
        e.currentTarget.setAttribute('class', `btn ${color}`);
        VaultUI.html_vaults();
    });
    /**
     * CREATE VAULT
     */
    Form.register("form-create-vault", async (form, elements) => {
        if (!confirm(`Do you confirm that you want to protect ${elements.T}?`)) return;
        // ---
        Windows.loader(true);
        const vault_id = await VaultService.create(elements);
        if (vault_id) {
            document.getElementById('dinamic-secrets').innerHTML = '';
            Log.summon(0, `${elements.T} saved.`);
            Windows.close('win-create-vault');
            // -- elimino cache
            form.reset();
            newVaultsInsertedData[elements.ST] = {};
            // ---
            await VaultUI.init_db_dom();
        } else {
            Log.summon(2, `Error while saving ${elements.T}`);
        }
        Windows.loader(false);
    });
    /**
     * NEW VAULT CUSTOM SECTION
     */
    document.querySelector('#add-custom-section-new-vault').addEventListener('click', () => {
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
    document.querySelector('#add-custom-section-update-vault').addEventListener('click', () => {
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
    Form.register("form-update-vault", async (form, elements) => {
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
            form.reset();
            await VaultUI.init_db_dom();
        } else {
            Log.summon(2, `Errore durante la modifica di ${elements.T}`);
        }
        Windows.loader(false);
    });
    /**
     * SYNCRONIZE VAULT
     */
    document.querySelector('#btn-sync-vault').addEventListener('click', async () => {
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
    document.querySelector('#btn-delete-vault').addEventListener('click', async (e) => {
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
    document.querySelector('#search-vault').addEventListener('keyup', (e) => {
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
    document.querySelector('#psw-gen-len').addEventListener('input', (e) => {
        document.getElementById('psw-gen-length-indicator').textContent = e.currentTarget.value;
    });
    
    Form.register('form-psw-gen', (form, elements) => {
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
     * Vista dei vault
     */
    const vaults_grid = document.getElementById('vaults-list');
    let vaults_view_active = await LocalStorage.get('vaults-view') ?? false;
    if (vaults_view_active) vaults_grid.classList.toggle('list');
    document.querySelector('.vaults-view').addEventListener('click', () => {
        vaults_grid.classList.toggle('list');
        // ---
        vaults_view_active = !vaults_view_active;
        LocalStorage.set('vaults-view', vaults_view_active);
    })
});

export class VaultUI {
    static search = new Search(true, null, null, 100);
    static view_indicator = -1; // usata per mostrare tutte o alcune categorie di segreti
    static current_order = 'az';
    // ---
    // cache per salvare i dati scritti nella finestra CREATE
    // static create_cache = { login: null, note: null, card: null, keys: null };
    // ---
    /**
     * inizializza tutto il necessario per avviare il vault se possibile
     */
    static async init() {
        /**
         * EVENT DELEGATIONS INIT
         */
        VaultDelegator.init();
        // ----
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
        document.getElementById('vault-counter').textContent = vaults_list.length;
        // -- se non ci sono vault da mostrare termino qui
        if (vaults_list.length === 0) return document.querySelector("#vaults-list").innerHTML = '';

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
        document.querySelector("#vaults-list").innerHTML = html;
        // -- se ce una ricerca attiva, la mantengo
        this.search.tabella(
            document.getElementById('search-vault'),
            'vaults-list',
            'vault-li'
        );
    }
    /**
     * Carica gli username utilizzati dall'utente sul datalist
     * @param {Set} used_usernames 
     */
    static html_used_usernames(used_usernames = VaultService.used_usernames) {
        const datalist = document.querySelector('#used-username');
        if (!datalist) return;
        let options = '';
        for (const username of used_usernames) {
            options += `<option value="${username}"></option>`;
        }
        datalist.innerHTML = options;
    }
}

// window.VaultUI = VaultUI;