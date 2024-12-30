import { Windows } from "../utils/windows.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { SecureTransfer } from "../utils/secure-transfer.js";

$(document).ready(async () => {
    SignInUI.init();
    /**
     * Micro utility per l'accesso
     */
    const auth_success = async () => {
        Windows.loader(true);
        const session_started = await AuthService.start_session();
        Windows.loader(false);
        return session_started;
    }
    /**
     * Verifico se ci sono dei parametri per l'accesso rapido
     */
    const quick_signin = await AuthService.quick_signin();
    if (quick_signin) {
        const session_started = auth_success();
        if (session_started) {
            Log.summon(0, `Hi ${await LocalStorage.get('email-utente')}`);
            setTimeout(() => {
                window.location.href = '/vault';
            }, 3000);
        }
    }
    /**
     * Provo ad accedere automaticamente
     */
    const saved_email = await LocalStorage.get('email-utente');
    // ---
    document.getElementById('recovery-email').value = saved_email;
    document.getElementById('recovery-device-mfa-email').value = saved_email;
    document.getElementById('recovery-device-email-email').value = saved_email;
    document.getElementById('email').value = saved_email;
    // ---
    if (saved_email && !quick_signin) {
        setTimeout(async () => {
            Log.summon(3, `Access saved as ${saved_email}`);
        }, 1000);
    }
    /**
     * LOGIN
     */
    Form.onsubmit('accedi', async (form, elements) => {
        const { email, password } = elements;
        // ---
        Windows.loader(true);
        if (await AuthService.signin(email, password)) {
            $(form).trigger('reset');
            // Log.summon(0, `Authenticated as ${email}`);
            window.location.href = '/vault';
        } else {
            Log.summon(1, `Note that, you can unlock your device through another or through mfa`);
        }
        Windows.loader(false);
    });
    /**
     * PASSWORD DIMENTICATA
     */
    Form.onsubmit('form-password-recovery', async (form, elements) => {
        const { email, code } = elements;
        Windows.loader(true);
        const password = await AuthService.master_password_recovery(email, code);
        // ---
        if (password) {
            Log.summon(0, 'Your password has been decrypted, we\'ve copied it into your clipboard.');
            navigator.clipboard.writeText(password);
            document.getElementById('password').value = password;
            $(form).trigger('reset');
            Windows.close('win-password-recovery');
        } else {
            Log.summon(2, 'Decryption failed');
        }
        Windows.loader(false);
    });
    /**
     * DEVICE RECOVERY MFA
     */
    Form.onsubmit('form-device-recovery-mfa', async (form, elements) => {
        const { email, code } = elements;
        Windows.loader(true);
        const message = await AuthService.device_recovery_mfa(email, code);
        if (message) {
            Log.summon(0, message);
            $(form).trigger('reset');
            Windows.close('win-device-recovery');
        }
        Windows.loader(false);
    });
    /**
     * DEVICE RECOVERY EMAIL
     */
    Form.onsubmit('form-device-recovery-email', async (form, elements) => {
        const { email, request_id, code } = elements;
        if (!code || code.length !== 6) return;
        Windows.loader(true);
        const message = await AuthService.device_recovery_email(email, request_id, code);
        if (message) {
            Log.summon(0, message);
            $(form).trigger('reset');
            Windows.close('win-device-recovery');
        }
        Windows.loader(false);
    });
    /**
     * Generate code
     */
    $('#btn-request-sign-in').on('click', () => {
        SignInUI.generate_code();
    });
    /**
     * GET SHARED SIGN-IN CREDENTIALS
     */
    Form.onsubmit('get-ssic', async (form, elements) => {
        const { code } = elements;
        // ---
        const res = await SecureTransfer.get('ssic', code);
        if (!res) return;
        const [email, password] = res.data;
        const passKey = res.passKey;
        // ---
        if (await AuthService.signin(email, password, passKey)) {
            Log.summon(0, `Hi ${email}`);
            $(form).trigger('reset');
            Windows.loader(true);
            setTimeout(() => {
                window.location.href = '/vault';
            }, 3000);
        }
    });
});

class SignInUI {
    static rsicode = null;
    static init() {
        this.rsicode = document.getElementById('rsicode');
        this.generate_code();
    }
    /**
     * Genera un codice casuale
     */
    static generate_code() {
        this.rsicode.value = SecureTransfer.random_code();
    }
}