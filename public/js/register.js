import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { Bytes } from "../utils/bytes.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { LocalStorage } from "../utils/local.js";

$(document).ready(async () => {
    const email = await LocalStorage.get('email-utente');
    if (email) {
        document.getElementById('verify-email-email').value = email;
        document.getElementById('verify-account-email').value = email;
    }
    /**
     * REGISTER
     */
    Form.onsubmit('registrati', async (form, elements) => {
        const { email, password, password2 } = elements;
        // -- controllo sulle password
        if (password !== password2) return Log.summon(1, 'Passwords doesn\'t match');;
        // ---
        Windows.loader(true);
        if (await AuthService.register(email, password)) {
            LocalStorage.set('email-utente', email);
            $(form).trigger('reset');
            Log.summon(1, "Almost done! Now you need to 'Set up MFA'.");
            document.getElementById('verify-account-email').value = email;
            document.getElementById('verify-email-email').value = email;
        }
        Windows.loader(false);
    });
    /**
     * ACCOUNT VERIFY
     */
    Form.onsubmit('account-verify', async (form, elements) => {
        const { email, code } = elements;
        if (!code || code.length !== 6) return Log.summon(1, "Invalid code");
        // ---
        if (await AuthService.verify_account(email, code)) {
            Log.summon(0, 'Account verified now you can sign-in');
            $(form).trigger('reset');
        }
    });
    /**
     * EMAIL VERIFY & ENABLE 2FA AUTH
     */
    Form.onsubmit('setup-mfa', async (form, elements) => {
        if (!elements.code || elements.code.length != 6) return Log.summon(1, "Invalid code");
        if (!confirm(`Attention! The secret will be shown via QR CODE that you will need to scan.`)) return;
        // ---
        const { email, request_id, code } = elements;
        // ---
        Windows.loader(true);
        if (await RegisterUI.enable_mfa(email, request_id, code)) {
            setTimeout(() => {
                Log.summon(1, "Now, you need to Verify your account.")
            }, 10000);
            $(form).trigger('reset');
        }
        Windows.loader(false);
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
        const base32_secret = Bytes.base32.to(Bytes.hex.from(secret));
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