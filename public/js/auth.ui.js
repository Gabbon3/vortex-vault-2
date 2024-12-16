import { Form } from "../utils/form.js";
import { AuthService } from "../service/auth.service.js";
import { Log } from "../utils/log.js";
import { finestra } from "../components/main.components.js";
import { Bytes } from "../utils/bytes.js";
import { LocalStorage } from "../utils/local.js";
import { qrcode } from "../utils/qrcode.js";

$(document).ready(() => {
    /**
     * ENABLE 2FA AUTH
     */
    $('#btn-enable-2fa').on('click', async () => {
        if (!confirm(`Attention! The secret will be shown via QR CODE that you will need to scan.`)) return;
        // ---
        finestra.loader(true);
        await AuthUI.enable_mfa();
        finestra.loader(false);
    });
    /**
     * CAMBIO PASSWORD
     */
    Form.onsubmit('form-change-password', async (form, elements) => {
        // -- check if new passwords corresponds
        if (elements.new_password !== elements.new_password_2) return Log.summon(1, 'New Password doesn\'t match');
        // ---
        if (!confirm('A locally backup will be made, the password of the backup will be the new password that you have chosen now, after the password is changed, you will have to restore from that backup your vault, do you confirm that you understand?')) return;
        if (!confirm('Really?')) return;
        // ---
        finestra.loader(true);
        if (await AuthService.change_password(elements.old_password, elements.new_password)) {
            Log.summon(0, "Password changed successfully");
            $(form).trigger('reset');
        }
        finestra.loader(false);
    });
});

class AuthUI {
    /**
     * Abilita MFA e lo mostra nell'html
     * @returns 
     */
    static async enable_mfa() {
        const secret = await AuthService.enable_mfa();
        if (!secret) return;
        const base32_secret = Bytes.base32.to(Bytes.hex.from(secret));
        const app_name = 'Vortex Vault';
        const username = await LocalStorage.get('username-utente');
        // ---
        const canvas = document.querySelector('#qrcode-2fa-secret');
        const uri = `otpauth://totp/${app_name}:${username}?secret=${base32_secret}&issuer=${app_name}`;
        qrcode.toCanvas(canvas, uri, {
            width: 200,
            margin: 2,
            color: {
                dark: "#FFFFFF",
                light: "#272727"
            }
        });
        canvas.style.height = 200;
        // -- copio negli appunti il segreto
        navigator.clipboard.writeText(base32_secret);
        // ---
        Log.summon(0, `MFA enabled`);
        setTimeout(() => {
            Log.summon(1, "Pay attention! The Qr Code will be invalidated in 20 seconds");
            setTimeout(() => {
                canvas.style.height = 0;
            }, 20000);
        }, 1000);
    }
    /**
     * Start sudo session that release an advanced access token
     * that allow the user to perform critical actions
     * @param {string} code mfa code
     */
    static async start_sudo_session(code) {
        // -- request mfa code
        const code = prompt('This operation require multi factor auth, insert the code:');
        if (!code || code.length != 6) return;
        const res = await AuthService.start_sudo_session(code);
        if (res) {
            Log.summon('Sudo session started')
        }
    }
}