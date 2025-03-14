import { Windows } from "../utils/windows.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { FileUtils } from "../utils/file.utils.js";
import { Bytes } from "../utils/bytes.js";

document.addEventListener('DOMContentLoaded', async () => {
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
    if (quick_signin === true) {
        const session_started = await auth_success();
        if (session_started === true || session_started === 0) {
            Log.summon(0, `Hi ${await LocalStorage.get('email-utente')}`, () => { window.location.href = '/vault'; });
            // setTimeout(() => {
            //     window.location.href = '/vault';
            // }, 3000);
        }
    }
    /**
     * Provo ad accedere automaticamente
     */
    const saved_email = await LocalStorage.get('email-utente');
    // ---
    document.getElementById('recovery-email').value = saved_email;
    document.getElementById('recovery-device-email-email').value = saved_email;
    document.getElementById('email').value = saved_email;
    // -- REQUEST SIGN-IN
    if (saved_email && !quick_signin && AuthService.check_signin_request_url()) {
        const session_started = await auth_success();
        if (session_started === true || session_started === 0) {
            // -- verifico se ci sono richieste di autenticazione
            const res = await AuthService.check_signin_request();
            if (res) {
                Log.summon(0, "Authentication request accepted");
            } else if (res === null) {
                Log.summon(2, "Something is missing here");
            }
            // ---
            Log.summon(3, `Access saved as ${saved_email}`);
        } else {
            Log.summon(1, "Authentication failed");
        }
    }
    /**
     * LOGIN
     */
    Form.onsubmit('accedi', async (form, elements) => {
        const { email, password } = elements;
        // ---
        Windows.loader(true);
        // -- accedo
        if (await AuthService.signin(email, password, null, true)) {
            form.reset();
            // Log.summon(0, `Authenticated as ${email}`);
            window.location.href = '/vault';
        } else {
            document.getElementById('recovery-email').value = email;
            document.getElementById('recovery-device-email-email').value = email;
        }
        Windows.loader(false);
    });
    /**
     * LOGGA CON LA PASSKEY
     */
    document.getElementById('signin-passkey').addEventListener('click', async (e) => {
        const email = await LocalStorage.get('email-utente');
        const master_key_exist = LocalStorage.has('master-key');
        // ---
        const was_logged = email !== null && master_key_exist;
        const name = email.split('@')[0];
        // -- se non ci sono informazioni locali salvate non è possibile accedere con la passkey
        if (!was_logged) return Log.summon(3, 'There are no data required to sign you in with the passkey, please sign-in with password.');
        // -- accedo
        const session_started = await AuthService.start_session();
        if (session_started !== true) {
            if (session_started === 0) Log.summon(3, `You are already signed in as ${name}`);
            return;
        }
        // ---
        Log.summon(0, `Welcome back ${name}`);
        setTimeout(() => {
            window.location.href = '/vault';
        }, 3000);
    });
    /**
     * PASSWORD DIMENTICATA
     */
    Form.onsubmit('form-password-recovery', async (form, elements) => {
        const { email, file, request_id, code } = elements;
        Windows.loader(true);
        // ---
        let private_key = null;
        try {
            private_key = Bytes.base64.decode(await FileUtils.read(file, false));
        } catch (error) {
            Log.summon(2, 'Error while reading your file');
            console.warn(error);
        }
        // ---
        const password = await AuthService.master_password_recovery(email, private_key, request_id, code);
        // ---
        if (password) {
            Log.summon(0, 'Your master password has been decrypted.');
            navigator.clipboard.writeText(password);
            document.getElementById('password').value = password;
            form.reset();
            Windows.close('win-password-recovery');
        } else {
            Log.summon(2, 'Decryption failed');
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
            form.reset();
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
                if (session_started !== true && session_started !== 0) return false;
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