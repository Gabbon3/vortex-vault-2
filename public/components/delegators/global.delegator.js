import { Windows } from "../../utils/windows.js";
import { PasskeyBtn } from "../passkey-btn.component.js";

export const GlobalDelegator = {
    initialized: false,
    init() {
        if (this.initialized) return;
        this.initialized = true;
        document.addEventListener('click', this.handleClick.bind(this));
    },
    /**
     * Gestisce tutti gli eventi delegatori globali relativi all'evento Click
     * @param {Event} e 
     */
    handleClick(e) {
        const handlers = [
            this.handleCloseWindowClick,
            this.handleOpenWindowClick,
            this.handleCheckAnimationClick,
            this.handleDeleteTextClick,
            this.handlePasskeyBtnClick,
        ];
        for (const handler of handlers) {
            if (handler.call(this, e)) break;
        }
    },
    /**
     * Gestisce tutti gli eventi relativi alla chiusura delle finestre
     * @param {Event} e 
     * @returns {boolean}
     */
    handleCloseWindowClick(e) {
        const btn = e.target.closest('.close');
        if (!btn) return false;

        const target = btn.getAttribute('data-target-close');
        Windows.close(target);
        return true;
    },
    /**
     * Gestisce tutti gli eventi relativi all'apertura delle finestre
     * @param {Event} e 
     * @returns {boolean}
     */
    handleOpenWindowClick(e) {
        const btn = e.target.closest('.open');
        if (!btn) return false;

        const target = btn.getAttribute('data-target-open');
        Windows.open(target);
        return true;
    },
    /**
     * Gestisce tutti i pulsanti che richiedono il Check Animation (CA)
     * @param {Event} e 
     * @returns {boolean}
     */
    handleCheckAnimationClick(e) {
        const ca = e.target.closest('.CA');
        if (!ca) return false;

        const btn = ca.querySelector('span');
        const currentIcon = btn.textContent;
        if (currentIcon === 'check') return true;

        btn.textContent = 'check';
        setTimeout(() => {
            btn.textContent = currentIcon;
        }, 1000);
        return true;
    },
    /**
     * Gestisce tutti i pulsanti che si occupano di eliminare del testo
     * @param {Event} e 
     * @returns {boolean}
     */
    handleDeleteTextClick(e) {
        const delBtn = e.target.closest('.del-val');
        if (!delBtn) return false;

        const targetId = delBtn.getAttribute('data-target-del');
        const target = document.getElementById(targetId);
        if (!target) return true;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value = '';
        } else {
            target.textContent = '';
        }

        const keyupEvent = new KeyboardEvent('keyup', {
            key: 'Delete',
            bubbles: true,
            cancelable: true,
        });

        target.dispatchEvent(keyupEvent);
        return true;
    },
    /**
     * Evento per gestire i click ai pulsanti Passkey
     * @param {Event} e
     * @returns {boolean}
     */
    async handlePasskeyBtnClick(e) {
        const btn = e.target.closest('passkey-btn');
        if (!btn) return false;
        // ---
        const pre_callback = btn.getAttribute('pre-callback');
        const callback = btn.getAttribute('callback');
        const endpoint = btn.getAttribute('endpoint');
        const method = btn.getAttribute('method');
        const passkey_need = btn.getAttribute('passkey-need');
        /**
         * Fase preliminare
         */
        if (pre_callback && PasskeyBtn.pre_callback?.[pre_callback]) {
            const result = await PasskeyBtn.pre_callback[pre_callback]();
            if (!result) return true;
        }
        /**
         * Fase effettiva
         */
        const res = await PasskeyService.authenticate({ endpoint, method, passkey_need });
        if (!res) return true;
        /**
         * Fase finale
         */
        if (!callback) {
            Log.summon(0, 'Operation performed successfully');
            return true;
        }
        // ---
        if (PasskeyBtn.callbacks?.[callback]) {
            await PasskeyBtn.callbacks[callback]();
        }

        return true;
    }
};