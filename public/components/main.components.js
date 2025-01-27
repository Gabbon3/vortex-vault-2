// WASM
import '../secure/rust.init.js';
// ---
import './navbar.component.js';
import './log.component.js';
import './vault-li.component.js';
import './footer.component.js';
import './device-list-item.component.js';
import './custom-vault-section.component.js';
import './colored-password.component.js';
import './password-strenght-bar.component.js';
import './email-verify-btn.component.js';
import './btn-copy.component.js';
import './btn-paste.component.js';
import './mfa-input.component.js';
import './passkey-btn.component.js';
import './passkey-list-item.component.js';
import './otp-copy-button.component.js';
import './btn-hide-show-protect-input.component.js';
import { Windows } from '../utils/windows.js';
import { QrCodeDisplay } from '../utils/qrcode-display.js';
import { LSE } from '../service/lse.public.service.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log(
`__         __  __         __
\\ \\       / /  \\ \\       / /
 \\ \\     / /    \\ \\     / /
  \\ \\   / /      \\ \\   / /
   \\ \\_/ /        \\ \\_/ /
    \\___/ ORTEX    \\___/ AUTL`);
    QrCodeDisplay.init();
    /**
     * FINESTRE
     */
    $(document).on("click", ".close", (btn) => {
        btn = btn.currentTarget;
        const target = $(btn).attr("data-target-close");
        Windows.close(target);
    });
    $(document).on("click", ".open", (btn) => {
        btn = btn.currentTarget;
        const target = $(btn).attr("data-target-open");
        Windows.open(target);
    });
    /**
     * pulsanti che richiedono l'animazione di check
     */
    $(document).on('click', '.CA', (e) => {
        const btn = e.currentTarget.querySelector('span');
        const current_icon = btn.textContent;
        if (current_icon === 'check') return;
        // ---
        btn.textContent = 'check';
        setTimeout(() => {
            btn.textContent = current_icon;
        }, 1000);
    });
    /**
     * Pulsanti cancella testo
     */
    $(document).on('click', '.del-val', (e) => {
        const target = document.getElementById(e.currentTarget.getAttribute('data-target-del'));
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ?
            target.value = '' :
            target.textContent = '';
        // --- simulo l'evento
        const keyupevent = new KeyboardEvent('keyup', {
            key: 'Delete',
            bubbles: true,
            cancelable: true,
        });
        // ---
        target.dispatchEvent(keyupevent);
    });
    /**
     * Chiudi Caricamento
     */
    $('#loader').on('dblclick', (e) => {
        $(e.currentTarget).fadeOut(200);
    });
    /**
     * sliders
     */
    
    $('.slider').on('click', (e) => {
        // -- id del container
        const target = document.getElementById(e.currentTarget.getAttribute('slider'));
        // ---
        $(target).slideToggle(200);
    });
});