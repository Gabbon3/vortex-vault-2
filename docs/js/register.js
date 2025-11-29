import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { LocalStorage } from "../utils/local.js";

document.addEventListener('DOMContentLoaded', async () => {
    const email = await LocalStorage.get('email');
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
            LocalStorage.set('email', email);
            form.reset();
            // Log.summon(1, "Almost done! now, to verify your email and create your first passkey, click on the \"Verify email & Create your first Passkey\" button.");
            document.getElementById('verify-email-email').value = email;
            Log.summon(0, 'Quasi fatto! Ora devi verificare la tua email e creare la tua prima passkey.');
            Windows.open('win-email-verify');
        }
        Windows.loader(false);
    });
    /**
     * EMAIL VERIFY & ENABLE 2FA AUTH
     */
    Form.register('verify-email', async (form, elements) => {
        if (!elements.code || elements.code.length != 6) return Log.summon(1, "Il codice non è valido");
        // ---
        const { email, request_id, code } = elements;
        // ---
        Windows.loader(true);
        const email_verification = await AuthService.verify_account(email, request_id, code)
        Windows.loader(false);
        if (!email_verification) return;
        // ---
        Log.summon(0, "Email verificata con successo");
        form.reset();
        Log.summon(0, "Tutto è pronto! Benvenuto/a in Vortex Vault");
        setTimeout(() => {
            window.location.href = '/signin';
        }, 3000);
    });
});