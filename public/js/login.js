import { finestra } from "../components/main.components.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
    /**
     * Provo ad accedere automaticamente
     */
    const saved_email = await LocalStorage.get('email-utente');
    // ---
    document.getElementById('recovery-email').value = saved_email;
    document.getElementById('recovery-device-email').value = saved_email;
    document.getElementById('email').value = saved_email;
    // ---
    if (saved_email) {
        setTimeout(async () => {
            if (confirm(`Access saved as ${saved_email}, continue?`)) {
                finestra.loader(true);
                const session_started = await AuthService.start_session();
                if (session_started) window.location.href = '/vault';
            }
        }, 1000);
    }
    /**
     * LOGIN
     */
    Form.onsubmit('accedi', async (form, elements) => {
        const { email, password } = elements;
        // ---
        finestra.loader(true);
        if (await AuthService.login(email, password)) {
            $(form).trigger('reset');
            Log.summon(0, `Authenticated as ${email}`);
        } else {
            Log.summon(1, `Note that, you can unlock your device through another or through mfa`);
        }
        finestra.loader(false);
    });
    /**
     * PASSWORD DIMENTICATA
     */
    Form.onsubmit('form-password-recovery', async (form, elements) => {
        const { email, code } = elements;
        finestra.loader(true);
        const password = await AuthService.master_password_recovery(email, code);
        // ---
        if (password) {
            Log.summon(0, 'Your password has been decrypted, we\'ve copied it into your clipboard.');
            navigator.clipboard.writeText(password);
            document.getElementById('password').value = password;
            $(form).trigger('reset');
            finestra.close('win-password-recovery');
        } else {
            Log.summon(2, 'Decryption failed');
        }
        finestra.loader(false);
    });
    /**
     * DEVICE RECOVERY
     */
    Form.onsubmit('form-device-recovery', async (form, elements) => {
        const { email, code } = elements;
        finestra.loader(true);
        const message = await AuthService.device_recovery(email, code);
        if (message) {
            Log.summon(0, message);
            $(form).trigger('reset');
            finestra.close('win-device-recovery');
        }
        finestra.loader(false);
    });
});