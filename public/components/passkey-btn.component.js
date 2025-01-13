import { PasskeyService } from "../service/passkey.public.service.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { VortexNavbar } from "./navbar.component.js";

class PasskeyBtn extends HTMLElement {
    static counter = 1;
    constructor() {
        super();
    }

    connectedCallback() {
        // -- variabili
        const endpoint = this.getAttribute("endpoint");
        const method = this.getAttribute("method") ?? "POST";
        const callback = this.getAttribute("callback") ?? false;
        const pre_callback = this.getAttribute("pre-callback") ?? false;
        const passkey_need = this.getAttribute("force-auth") === 'true';
        // ---
        const icon = this.getAttribute("icon") ?? "passkey";
        const btn_class = this.getAttribute("b-class") ?? "primary";
        const text_content = this.textContent || "Authorize";
        const button_id = "pskbtn-" + PasskeyBtn.counter;
        PasskeyBtn.counter++;
        // -- HTML
        this.innerHTML = `<button type="button" id="${button_id}" class="btn ${btn_class}">
            <span class="material-symbols-rounded">${icon}</span>
            ${text_content}
        </button>`;
        // -- ELEMENTI
        document
            .getElementById(button_id)
            .addEventListener("click", async () => {
                /**
                 * Fase preliminare
                 */
                if (pre_callback && PasskeyBtn.pre_callback[pre_callback]) {
                    const result = await PasskeyBtn.pre_callback[pre_callback]();
                    // -- se il pre-callback fallisce, non proseguo
                    if (!result) return;
                }
                /**
                 * Fase effettiva
                 */
                const res = await PasskeyService.authenticate({ endpoint, method, passkey_need });
                if (!res) return;
                /**
                 * Fase finale
                 */
                if (!callback) return Log.summon(0, 'Operation performed successfully');
                // ---
                if (PasskeyBtn.callbacks[callback]) {
                    await PasskeyBtn.callbacks[callback]();
                }
            });
    }

    static pre_callback = {
        /**
         * DELETE ACCOUNT
         */
        'deleteaccount': async () => {
            if (!confirm('Are you sure you want to delete your account?')) return false;
            return true;
        },
    }

    static callbacks = {
        'sudosession': async () => {
            /**
             * AVVIO ADVANCED SESSION
             */
            Log.summon(0, 'Sudo session started');
            const expire = new Date(Date.now() + 45 * 60 * 1000);
            await LocalStorage.set("session-expire", expire);
            await LocalStorage.set("sudo-expire", expire);
        },
        /**
         * DELETE ACCOUNT
         */
        'deleteaccount': async () => {
            localStorage.clear();
            sessionStorage.clear();
            Log.summon(0, "Your account has been deleted, you will be disconnected from this page in a moment.");
            setTimeout(() => {
                window.location.href = '/signin';
            }, 3000);
        },
        /**
         * PASSKEY TEST
         */
        'passkeytest': async () => {
            Log.summon(0, "Passkey test performed successfully");
        }
    };
}

customElements.define("passkey-btn", PasskeyBtn);
