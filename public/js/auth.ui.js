import { Form } from "../utils/form.js";
import { AuthService } from "../service/auth.service.js";
import { Log } from "../utils/log.js";
import { finestra } from "../components/main.components.js";
import { Bytes } from "../utils/bytes.js";
import { LocalStorage } from "../utils/local.js";
import { qrcode } from "../utils/qrcode.js";
import { VortexNavbar } from "../components/navbar.component.js";
import { FileUtils } from "../utils/file.utils.js";

$(document).ready(() => {
    /**
     * ENABLE 2FA AUTH
     */
    Form.onsubmit('form-new-mfa-secret', async (form, elements) => {
        if (!elements.code || elements.code.length != 6) return Log.summon(1, "Invalid code");
        if (!confirm(`Attention! The secret will be shown via QR CODE that you will need to scan.`)) return;
        // ---
        const { request_id, code } = elements;
        // ---
        finestra.loader(true);
        if (await AuthUI.enable_mfa(request_id, code)) {
            $(form).trigger('reset');
        }
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
    /**
     * GENERATE RECOVERY CODE
     */
    Form.onsubmit('form-new-recovery-code', async (form, elements) => {
        const { password } = elements;
        // -- verifico la password dell'utente
        if (!(await AuthService.verify_master_password(password))) {
            Log.summon(2, "Password isn't correct");
            return;
        }
        // ---
        finestra.loader(true);
        // ---
        const code = await AuthService.generate_recovery_code(password);
        // ---
        if (code) {
            Log.summon(0, "Recovery code generated successfully");
            navigator.clipboard.writeText(code);
            Log.summon(3, "Recovery code has been copied on your clipboard");
            FileUtils.download('Recovery Code', 'txt', code);
            $(form).trigger('reset');
        }
        finestra.loader(false);
    });
    /**
     * AVVIO SUDO SESSION
     */
    Form.onsubmit('form-start-sudo-session', async (form, elements) => {
        if (await AuthService.start_sudo_session(elements.code)) {
            Log.summon(0, 'Sudo session started successfully');
            // ---
            const expire = new Date(Date.now() + (20 * 60 * 1000));
            await LocalStorage.set('session-expire', expire);
            await LocalStorage.set('sudo-expire', expire);
            await VortexNavbar.sudo_indicator_init();
            // ---
            $(form).trigger('reset');
        }
    });
    /**
     * QUICK SIGN-IN
     */
    Form.onsubmit('form-fsi', async (form, elements) => {
        const url = await AuthService.request_quick_signin();
        if (url) {
            AuthUI.show_quick_signin(url);
            $(form).trigger('reset');
        } else if (url === null) {
            Log.summon(2, "Invalid password");
        }
    });
    /**
     * SIGN-OUT
     */
    $('#logout-btn').on('click', async () => {
        if (!confirm('Are you sure you want to sign out?')) return;
        // ---
        const signed_out = await AuthService.signout();
        if (signed_out) {
            Log.summon(0, 'Disconnected successfully, you will be redirected to sign-in page');
            setTimeout(() => {
                window.location.href = '/signin';
            }, 3000);
        }
    });
});

class AuthUI {
    /**
     * Mostra il qrcode per accedere rapidamente su un altro dispositivo
     * @param {string} url 
     */
    static async show_quick_signin(url) {
        const canvas = document.getElementById('qrcode-fsi');
        qrcode.toCanvas(canvas, url, {
            width: 200,
            margin: 2,
            color: {
                dark: "#FFFFFF",
                light: "#302929"
            }
        });
        canvas.style.height = 200;
        // -- copio negli appunti il link
        navigator.clipboard.writeText(url);
        // --
        setTimeout(() => {
            Log.summon(1, "Pay attention! The Qr Code will be hidden in 30 seconds");
            setTimeout(() => {
                canvas.style.height = 0;
            }, 30000);
        }, 1000);
    }
    /**
     * Abilita MFA e lo mostra nell'html
     * @param {string} email_code password dell'utente
     * @returns {boolean}
     */
    static async enable_mfa(request_id, email_code) {
        const secret = await AuthService.enable_mfa(request_id, email_code);
        if (!secret) return false;
        const base32_secret = Bytes.base32.to(Bytes.hex.from(secret));
        const app_name = 'Vortex Vault';
        const username = await LocalStorage.get('email-utente');
        // ---
        const canvas = document.querySelector('#qrcode-2fa-secret');
        const uri = `otpauth://totp/${app_name}:${username}?secret=${base32_secret}&issuer=${app_name}`;
        qrcode.toCanvas(canvas, uri, {
            width: 200,
            margin: 2,
            color: {
                dark: "#FFFFFF",
                light: "#302929"
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
        return true;
    }
}