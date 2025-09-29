// Diagnostic
import '../utils/diagnostic.js';
// ---
import './footer.component.js';
import './navbar.component.js';
import './log.component.js';
import './vault-li.component.js';
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
import './settings/tools.component.js';
import { QrCodeDisplay } from '../utils/qrcode-display.js';
import '../js/theme.ui.js';
import { Sliders } from '../utils/sliders.js';
import { GlobalDelegator } from './delegators/global.delegator.js';
import { Form } from '../utils/form.js';

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
     * Delegazione Eventi Globali
     */
    GlobalDelegator.init();
    Form.init();
    /**
     * Chiudi Caricamento
     */
    document.querySelector('#loader', 'dblclick', (e) => {
        e.currentTarget.classList.remove('show');
    });
    /**
     * Pulsante Menu
     */
    document.querySelector('button.menu').addEventListener('click', (e) => {
        document.querySelector('vortex-navbar').classList.toggle('show');
    });
    /**
     * SLIDERS
     */
    Sliders.init();
});