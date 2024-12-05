import { finestra } from "../components/main.components.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
    /**
     * Provo ad accedere automaticamente
     */
    const saved_username = await LocalStorage.get('username-utente');
    // ---
    document.getElementById('recovery-username').value = saved_username;
    document.getElementById('recovery-device-username').value = saved_username;
    document.getElementById('username').value = saved_username;
    // ---
    if (saved_username) {
        if (confirm(`Access saved as ${saved_username}, continue?`)) {
            const session_started = await AuthService.start_session();
            if (session_started) window.location.href = '/vault';
        }
    }
    /**
     * LOGIN
     */
    Form.onsubmit('accedi', async (form, elements) => {
        const { username, password } = elements;
        // ---
        if (await AuthService.login(username, password)) {
            $(form).trigger('reset');
            Log.summon(0, `Authenticated as ${username}`);
        } else {
            Log.summon(1, `Note that, you can unlock your device through another or through mfa`);
        }
    });
    /**
     * PASSWORD DIMENTICATA
     */
    Form.onsubmit('form-password-recovery', async (form, elements) => {
        const { username, code } = elements;
        const password = await AuthService.master_password_recovery(username, code);
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
    });
    /**
     * DEVICE RECOVERY
     */
    Form.onsubmit('form-device-recovery', async (form, elements) => {
        const { username, code } = elements;
        const message = await AuthService.device_recovery(username, code);
        if (message) {
            Log.summon(0, message);
            $(form).trigger('reset');
            finestra.close('win-device-recovery');
        }
    });
});