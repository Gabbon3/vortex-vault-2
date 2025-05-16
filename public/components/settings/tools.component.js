import { Form } from "../../utils/form.js";
import { LocalStorage } from "../../utils/local.js";
import { Log } from "../../utils/log.js";
import { API } from "../../utils/api.js";
import { date } from "../../utils/dateUtils.js";

class SettingsComponent extends HTMLElement {
    static default_sections = [
        'advanced-session',
        'change-password',
        'recovery-file',
        'quick-sign-in',
        'message-authentication-code',
        'app-theme',
        'help',
        'delete-account',
    ];

    constructor() {
        super();
        this.initialized = false;
        this.sections = {};
        this.events = {
            'message-authentication-code': () => {
                /**
                 * CHECK MESSAGE AUTHENTICATION CODE
                 */
                Form.register('form-cmac', async (form, elements) => {
                    const code = elements['tuamadre'];
                    if (!code.includes('.')) return Log.summon(1, "Invalid format");
                    // -- email
                    const email = await LocalStorage.get('email-utente');
                    // ---
                    const res = await API.fetch('/auth/vmac', {
                        method: 'POST',
                        body: { email, mac: code.trim() },
                        loader: true,
                    });
                    const { status, timestamp } = res;
                    // -- creo il report
                    const icon = ['check', 'delete_history', 'warning', 'warning'][status - 1];
                    const type = ['success', 'warning', 'danger', 'danger'][status - 1];
                    const title = ['Valid', 'Expired', 'Not valid', 'Not yours'][status - 1];
                    const message = [
                        '~', 
                        'This token is valid but expired', 
                        'This token does not come from us, be careful', 
                        'This token is valid but was not generated for you, someone may have tried to use their (valid) one to cheat you, be careful'
                    ][status - 1];
                    let report = `<div class="mt-2 alert ${type} monospace">
                    <div class="flex d-column gap-75">
                        <strong title="Status" class="flex y-center gap-75"><span class="material-symbols-rounded">${icon}</span> <span>${title}</span> </strong>
                        <div title="Message" class="flex y-center gap-75"><span class="material-symbols-rounded">info</span> <span>${message}</span> </div>
                        <div title="Issued on" class="flex y-center gap-75"><span class="material-symbols-rounded">today</span> <span>${date.format('%d %M %Y at %H:%i', new Date(timestamp))}</span> </div>
                    </div></div>`;
                    // ---
                    document.getElementById('cmac-result').innerHTML = report;
                });
            }
        }
    }
    /**
     * Inizializza gli eventi associati alle sezioni se presenti
     */
    init_events() {
        for (const section in this.sections) {
            if (this.events[section]) this.events[section]();
        }
    }

    connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;
        // ---
        // se 'revert' allora nascondo tutte le sezioni di default
        const hide_all_sections = this.getAttribute('revert') ? false : true;
        // per ogni sezione disponibile verifico se sono state passate proprietà di visualizzazione custom
        // ad esempio potrebbe essere che il delete-account sia impostato su false, cosi lo prendo
        for (let section of SettingsComponent.default_sections) {
            const attribute = this.getAttribute(section);
            this.sections[section] = attribute ? JSON.parse(attribute) : hide_all_sections;
        }
        // passo le sezioni da mostrare o no se ce ne sono e renderizzo il componente
        this.innerHTML = this.render();
        // inizializzo gli eventi per ultimo, dopo il render
        this.init_events();
    }
    /**
     * Genera html per la finestra delle impostazioni
     * @param {Object} sections default tutte su true
     * @returns {string} html della finestra di settings
     */
    render(sections = this.sections) {
        let html = `
        <div class="window m pl" id="win-settings">
        <div class="flex y-center maincolor blue">
            <h2 class="icon mb-0">
                <span class="material-symbols-rounded">handyman</span>
                Tools
            </h2>
            <button class="btn t close l last" data-target-close="win-settings">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        `;
        // Sessione avanzata
        if (sections['advanced-session']) {
            html += `
        <hr>
        <!-- ADVANCED SESSION == as -->
        <div class="maincolor lightblue">
            <h3 class="icon slider" slider="cont-sudo-session">
                <span class="material-symbols-rounded warning">vpn_key</span>
                Advanced Session
            </h3>
            <div class="isle bg-4 slider-cont slow" data-open="false" id="cont-sudo-session">
                <p class="mt-0 mb-2">
                    Enable <strong>advanced session</strong> to perform critical operations.
                    The session will only last 10 minutes for safety reasons. <br>
                    All operations that require this session are marked with this symbol
                    <span class="material-symbols-rounded warning">vpn_key</span>
                </p>
                <div class="isle bg-3 flex d-row br-l">
                    <h4 class="icon m-0">
                        <span class="material-symbols-rounded">passkey</span>
                        With Passkey
                    </h4>
                    <passkey-btn class="last" icon="security" endpoint="/pulse/spt" callback="sudosession">
                        Activate
                    </passkey-btn>
                </div>
                <hr>
                <form autocomplete="off" class="isle bg-3 br-l" id="form-advanced-session-with-email">
                    <h4 class="icon">
                        <span class="material-symbols-rounded">mail</span>
                        With Email
                    </h4>
                    <hr>
                    <mfa-input class="mb-2" input-id="advanced-session-code"></mfa-input>    
                    <email-verify-btn target-id="advanced-session-code"></email-verify-btn>
                    <hr>
                    <!-- --- -->
                    <button type="submit" class="btn primary">
                        <span class="material-symbols-rounded">security</span>
                        Activate
                    </button>
                </form>
            </div>
        </div>
            `;
        }
        // Cambio Password
        if (sections['change-password']) {
            html += `
        <!-- CHANGE PASSWORD -->
        <hr>
        <div class="maincolor red">
            <h3 class="icon slider" slider="form-change-password">
                <span class="material-symbols-rounded">key</span>
                Change Password
                <span class="material-symbols-rounded warning" title="Sudo Session Required">vpn_key</span>
            </h3>
            <form autocomplete="off" class="isle bg-4 slider-cont slow" data-open="false" id="form-change-password">
                <p class="mt-0 mb-2">
                    <strong>Before changing your password</strong>
                    you should know that you will have to manually restore a backup, 
                    which will be generated locally after the change, 
                    you will have to go to the backup section and restore the 
                    backup from the file you just downloaded.
                </p>
                <label for="old-password">
                    <span class="material-symbols-rounded">key_vertical</span>
                    Old Password
                </label>
                <input name="old_password" type="password" class="input-text mono" id="old-password" autocomplete="off" required>
                <hr>
                <label for="new-password">
                    <span class="material-symbols-rounded">key_vertical</span>
                    New Password
                </label>
                <input name="new_password" type="password" class="input-text mono" id="new-password" autocomplete="off" required>
                <label for="new-password-2">
                    <span class="material-symbols-rounded">key_vertical</span>
                    Repeat new Password
                </label>
                <input name="new_password_2" type="password" class="input-text mono" id="new-password-2" autocomplete="off" required>
                <!-- --- -->
                <div class="flex-gap-50 mt-2">
                    <button type="submit" class="btn primary">
                        <span class="material-symbols-rounded">sync</span>
                        Change Password
                    </button>
                </div>
            </form>
        </div>
            `;
        }
        // File di recupero
        if (sections['recovery-file']) {
            html += `
            <!-- RECOVERY CODE -->
        <hr>
        <div class="maincolor purple">
            <h3 class="icon slider" slider="cont-rec-code">
                <span class="material-symbols-rounded">lock_reset</span>
                Recovery Key
                <span class="material-symbols-rounded warning" title="Sudo Session Required">vpn_key</span>
            </h3>
            <div class="isle bg-4 slider-cont" data-open="false" id="cont-rec-code">
                <p class="mt-0 mb-2">
                    Generate a recovery key to help you recover your master password if you forget it.
                </p>
                <form autocomplete="off" id="form-new-recovery-code">
                    <label for="password-recovery">
                        <span class="material-symbols-rounded">key_vertical</span>
                        Password
                    </label>
                    <div class="flex gap-50">
                        <input name="password" type="password" class="input-text mono" id="password-recovery" autocomplete="off" required>
                        <btn-paste target="password-recovery"></btn-paste>
                    </div>
                    <p class="description">
                        You need to enter your password to perform this operation.
                    </p>
                    <!-- --- -->
                    <div class="flex-gap-50 mt-2">
                        <button type="submit" class="btn primary">
                            <span class="material-symbols-rounded">security</span>
                            Generate Recovery Key File
                        </button>
                    </div>
                </form>
            </div>
        </div>
            `;
        }
        // Quick Sign in
        if (sections['quick-sign-in']) {
            html += `
        <!-- QUICK SIGN-IN -->
        <hr>
        <div class="maincolor yellow">
            <h3 class="icon slider" slider="cont-qsi">
                <span class="material-symbols-rounded">id_card</span>
                Quick Sign-in
            </h3>
            <div class="isle bg-4 slider-cont" data-open="false" id="cont-qsi">
                <p class="mt-0 mb-2">
                    Generates a single-use link shown via Qr code for quick Sign-in from another device.
                </p>
                <form autocomplete="off" id="form-fsi">
                    <button type="submit" class="btn primary mt-2">
                        <span class="material-symbols-rounded">qr_code</span>
                        Create link
                    </button>
                </form>
            </div>
        </div>
            `;
        }
        // Message authentication code
        if (sections['message-authentication-code']) {
            html += `
            <!-- CHECK MESSAGE AUTHENTICATION CODE -->
        <hr>
        <div class="maincolor olivegreen">
            <h3 class="icon slider" slider="cont-cmac">
                <span class="material-symbols-rounded">mark_email_read</span>
                Check Message Authentication Code
            </h3>
            <div class="isle bg-4 slider-cont maincolor olivegreen" id="cont-cmac">
                <p class="m-0 mb-3">
                    Here you can check the validity of the message authentication codes 
                    in the emails you receive from us, which is useful for verifying 
                    whether the emails actually come from us or are instead phishing 
                    attempts.
                </p>
                <form autocomplete="off" id="form-cmac">
                    <label for="tuamadre-cmac">
                        <span class="material-symbols-rounded">password</span>
                        Message Authentication Code
                    </label>
                    <div class="flex gap-75">
                        <input name="tuamadre" type="text" class="input-text mono" id="tuamadre-cmac" autocomplete="off" placeholder="**.**.******" required>
                        <btn-paste target="tuamadre-cmac"></btn-paste>
                    </div>
                    <div class="flex gap-50">
                        <button type="submit" class="btn primary mt-2">
                            <span class="material-symbols-rounded">check</span>
                            Check
                        </button>
                        <button type="reset" class="btn secondary CA mt-2">
                            <span class="material-symbols-rounded">close</span>
                            Reset
                        </button>
                    </div>
                </form>
                <div id="cmac-result"></div>
            </div>
        </div>
        `;
        }
        // Tema app
        if (sections['app-theme']) {
            html += `
            <hr>
        <!-- TEMA APP -->
        <div class="maincolor blue">
            <h3 class="icon slider" slider="cont-theme">
                <span class="material-symbols-rounded">palette</span>
                Theme
            </h3>
            <div class="isle bg-4 slider-cont fast" data-open="false" id="cont-theme">
                <p class="m-0 mb-2">
                    Change the color scheme.
                </p>
                <select id="theme-selector" class="input-text monospace">
                    <option disabled>Dark Theme</option>
                    <option value="earth" selected>🌍 Earth</option>
                    <option value="monokai">🌙 Monokai</option>
                    <option value="dracula">🧛‍♂️ Dracula</option>
                    <option value="tokyonight">🌆 Tokyo Night</option>
                    <option value="cyberpunk">🚀 Cyber Punk</option>
                    <option value="coffee">☕ Coffee</option>
                    <option value="blossom">🌸 Blossom</option>
                    <option value="ocean">🌊 Ocean</option>
                    <option disabled>Light Theme</option>
                    <option value="cloud">☁️ Cloud</option>
                </select>
            </div>
        </div>
        `;
        }
        // Sezione Aiuto
        if (sections['help']) {
            html += `
            <hr>
        <!-- HELP -->
        <div class="maincolor orange">
            <h3 class="icon slider" slider="cont-help-tools">
                <span class="material-symbols-rounded">help</span>
                Help
            </h3>
            <div class="isle bg-4 slider-cont fast" data-open="false" id="cont-help-tools">
                <p class="m-0 mb-2">
                    if you cannot log in correctly, press "Delete local data".
                </p>
                <button class="btn warning" id="btn-delete-local-data">
                    <span class="material-symbols-rounded">delete</span>
                    Delete local data
                </button>
            </div>
        </div>
        `;
        }
        html += `<hr>
        <!-- ---- -->
        <div class="flex gap-50">
            ${
                sections['delete-account']
                    ? `<button class="btn danger open" data-target-open="win-delete-account">
                <span class="material-symbols-rounded">delete_forever</span>
                Delete Account
            </button>`
                    : ""
            }
            <logout-btn class="btn warning ${sections['delete-account'] ? 'last' : ''}"></logout-btn>
        </div>`;
        return html;
    }
}

customElements.define("settings-vault", SettingsComponent);
