import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { Bytes } from "../utils/bytes.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { LocalStorage } from "../utils/local.js";
import { PasskeyService } from "../service/passkey.public.service.js";

document.addEventListener('DOMContentLoaded', async () => {
    const email = await LocalStorage.get('email-utente');
    if (email) {
        document.getElementById('verify-email-email').value = email;
    }
    /**
     * REGISTER
     */
    Form.register('registrati', async (form, elements) => {
        const { email, password, password2 } = elements;
        // -- controllo sulle password
        if (password !== password2) return Log.summon(1, 'Passwords doesn\'t match');;
        // ---
        Windows.loader(true, "Creating your new account, please wait");
        if (await AuthService.register(email, password)) {
            LocalStorage.set('email-utente', email);
            form.reset();
            // Log.summon(1, "Almost done! now, to verify your email and create your first passkey, click on the \"Verify email & Create your first Passkey\" button.");
            document.getElementById('verify-email-email').value = email;
            Log.summon(0, 'Almost done! Now, you need to verify your email and create your first passkey.');
            Windows.open('win-email-verify');
        }
        Windows.loader(false);
    });
    /**
     * EMAIL VERIFY & ENABLE 2FA AUTH
     */
    Form.register('setup-passkey', async (form, elements) => {
        if (!elements.code || elements.code.length != 6) return Log.summon(1, "Invalid code");
        // ---
        const { email, request_id, code } = elements;
        // ---
        Windows.loader(true);
        const email_verification = await AuthService.verify_account(email, request_id, code)
        Windows.loader(false);
        if (!email_verification) return;
        // ---
        Log.summon(0, "Email verified successfully");
        // -- registro la passkey
        const passkey_registered = await PasskeyService.activate_new_passkey(email, request_id, code);
        if (!passkey_registered) return Log.summon(1, 'Try again');
        // ---
        Log.summon(0, "Everything is ready, welcome to Vortex Vault");
        setTimeout(() => {
            window.location.href = '/signin';
        }, 3000);
    });
});

class RegisterUI {
    /**
     * Abilita MFA e lo mostra nell'html
     * @param {string} email_code password dell'utente
     * @returns {boolean}
     */
    static async enable_mfa(email, request_id, email_code) {
        const secret = await AuthService.enable_mfa(email, request_id, email_code);
        if (!secret) return false;
        const base32_secret = Bytes.base32.encode(Bytes.hex.decode(secret));
        // -- copio negli appunti il segreto
        navigator.clipboard.writeText(base32_secret);
        Log.summon(3, 'Secret copied into your clipboard');
        // ---
        const app_name = 'Vortex Vault';
        // ---
        const uri = `otpauth://totp/${app_name}:?secret=${base32_secret}&issuer=${app_name}`;
        QrCodeDisplay.generate({
            data: uri,
            timeout: 20000,
            callback: () => {
                Log.summon(1, "Pay attention! The Qr Code will be hidden in 20 seconds");
            }
        });
        // ---
        return true;
    }
}