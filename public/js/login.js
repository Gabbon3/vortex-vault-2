import { Windows } from "../utils/windows.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
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
        const session_started = await auth_success();
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
        const session_started = await auth_success();
        if (session_started) {
            // -- verifico se ci sono richieste di autenticazione
            const res = await AuthService.check_signin_request();
            if (res) {
                Log.summon(0, "Authentication request accepted");
            } else if (res === null) {
                Log.summon(2, "Something is missing here");
            }
            // ---
            Log.summon(3, `Access saved as ${saved_email}`);
        }
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
            document.getElementById('recovery-email').value = email;
            document.getElementById('recovery-device-mfa-email').value = email;
            document.getElementById('recovery-device-email-email').value = email;
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
     * REQUEST SIGN-IN
     */
    RequestSignIn.init();
});

class RequestSignIn {
    static btn = null;
    static used = true;
    static request_id = null;
    static key = null;

    static init() {
        this.btn = document.getElementById('btn-request-sign-in');
        this.btn.addEventListener('click', async () => {
            RequestSignIn.used = !RequestSignIn.used;
            if (RequestSignIn.used) {
                // ---
                const authenticated = await AuthService.check_signin_response(RequestSignIn.request_id, RequestSignIn.key);
                if (!authenticated) {
                    Log.summon(1, 'Authentication failed, please try again');
                    return false;
                }
                // ---
                const session_started = await AuthService.start_session();
                if (!session_started) return false;
                // ---
                Log.summon(0, `Hi ${await LocalStorage.get('email-utente')}`);
                setTimeout(() => {
                    window.location.href = '/vault';
                }, 3000);
            } else {
                if (!confirm(`attention, a qr code will be shown for you to scan with an authenticated device, then you can close the qrcode window and re-click on "Sign-in with another device" to authenticate`)) {
                    RequestSignIn.used = !RequestSignIn.used;
                    return false;
                }
                // -- effettuo una richiesta
                const res = await AuthService.request_signin();
                RequestSignIn.request_id = res.id;
                RequestSignIn.key = res.key;
            }
        });
    }
}