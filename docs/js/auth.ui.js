import { Form } from "../utils/form.js";
import { AuthService } from "../service/auth.service.js";
import { Log } from "../utils/log.js";
import { LocalStorage } from "../utils/local.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', async () => {
    /**
     * CAMBIO PASSWORD
     */
    Form.register('form-change-password', async (form, elements) => {
        // -- check if new passwords corresponds
        if (elements.new_password !== elements.new_password_2) return Log.summon(1, 'Le password non corrispondono');
        // ---
        if (!confirm('Confermi di voler effettuare il cambio della password? Verrà automaticamente eseguito il logout su tutti gli altri dispotivi connessi.')) return;
        // ---
        Windows.loader(true, "Sto modificando la password...");
        if (await AuthService.changePassword(elements.new_password)) {
            Log.summon(0, "Password cambiata con successo");
            form.reset();
        }
        Windows.loader(false);
    });
    /**
     * SESSIONE AVANZATA VIA MAIL
     */
    Form.register('form-advanced-session-with-email', async (form, elements) => {
        const { request_id, code } = elements;
        if (!code || code.length!== 6) return Log.summon(1, "Codice non valido");
        // ---
        Windows.loader(true);
        const email = await LocalStorage.get('email');
        const activated = await AuthService.enableAdvancedSession(email, request_id, code);
        if (activated) {
            Log.summon(0, 'Sessione avanzata iniziata');
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
            Log.summon(2, "Password non valida");
        }
    });
    /**
     * EXTENSION QUICK SIGN-IN
     */
    Form.register('form-ext-sign-in', async (form, elements) => {
        const token = await AuthService.requestExtensionTokenSignIn();
        if (token) {
            navigator.clipboard.writeText(token);
            Log.summon(0, "Il token è stato correttamente generato e copiato negli appunti");
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
        Log.summon(0, 'Link copiato nella tua clipboard');
    }
}