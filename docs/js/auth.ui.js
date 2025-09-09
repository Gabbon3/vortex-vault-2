import { Form } from "../utils/form.js";
import { AuthService } from "../service/auth.service.js";
import { Log } from "../utils/log.js";
import { Bytes } from "../utils/bytes.js";
import { LocalStorage } from "../utils/local.js";
import { FileUtils } from "../utils/file.utils.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', async () => {
    /**
     * CAMBIO PASSWORD
     */
    Form.register('form-change-password', async (form, elements) => {
        // -- check if new passwords corresponds
        if (elements.new_password !== elements.new_password_2) return Log.summon(1, 'New Password doesn\'t match');
        // ---
        if (!confirm('Confirm that you want to change the password? All active sessions except this one will be deleted?')) return;
        // ---
        Windows.loader(true, "Changing your master password");
        if (await AuthService.changePassword(elements.new_password)) {
            Log.summon(0, "Password changed successfully");
            form.reset();
        }
        Windows.loader(false);
    });
    /**
     * SESSIONE AVANZATA VIA MAIL
     */
    Form.register('form-advanced-session-with-email', async (form, elements) => {
        const { request_id, code } = elements;
        if (!code || code.length!== 6) return Log.summon(1, "Invalid code");
        // ---
        Windows.loader(true);
        const email = await LocalStorage.get('email-utente');
        const activated = await AuthService.getShivPrivilegedToken(email, request_id, code);
        if (activated) {
            Log.summon(0, 'Advanced session started');
            form.reset();
        }
        Windows.loader(false);
    });
    /**
     * QUICK SIGN-IN
     */
    Form.register('form-fsi', async (form, elements) => {
        const url = await AuthService.request_quick_signin();
        if (url) {
            AuthUI.show_quick_signin(url);
            form.reset();
        } else if (url === null) {
            Log.summon(2, "Invalid password");
        }
    });
    /**
     * EXTENSION QUICK SIGN-IN
     */
    Form.register('form-ext-sign-in', async (form, elements) => {
        const token = await AuthService.requestExtensionTokenSignIn();
        if (token) {
            navigator.clipboard.writeText(token);
            Log.summon(0, "Il token è stato correttamente generato e copiato sulla tua clipboard");
            form.reset();
        } else if (token === null) {
            Log.summon(2, "Qualcosa è andato storto");
        }
    });
});

class AuthUI {
    /**
     * Mostra il qrcode per accedere rapidamente su un altro dispositivo
     * @param {string} url 
     */
    static async show_quick_signin(url) {
        QrCodeDisplay.generate({
            data: url
        });
        // -- copio negli appunti il link
        navigator.clipboard.writeText(url);
        Log.summon(0, 'Link copied into your clipboard');
    }
    /**
     * Abilita MFA e lo mostra nell'html
     * @param {string} email_code password dell'utente
     * @returns {boolean}
     */
    static async enable_mfa(request_id, email_code) {
        const email = await LocalStorage.get('email-utente');
        const secret = await AuthService.enable_mfa(email, request_id, email_code);
        if (!secret) return false;
        const base32_secret = Bytes.base32.encode(Bytes.hex.decode(secret));
        // -- copio negli appunti il segreto
        navigator.clipboard.writeText(base32_secret);
        Log.summon(3, 'Secret copied into your clipboard');
        // ---
        const app_name = 'Vortex Vault';
        // ---
        const uri = `otpauth://totp/${app_name}:${email}?secret=${base32_secret}&issuer=${app_name}`;
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