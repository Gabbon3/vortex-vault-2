import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";

$(document).ready(async () => {
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
            $(form).trigger('reset');
            Log.summon(0, `${email}, you have been successfully registered`);
            Log.summon(1, "Now verify your email clicking the button below so you can then sign-in with no problems");
            document.getElementById('verify-email-email').value = email;
        }
        Windows.loader(false);
    });
    /**
     * EMAIL VERIFY
     */
    Form.onsubmit('email-verify', async (form, elements) => {
        const { email, request_id, code } = elements;
        if (!code || code.length !== 6) return Log.summon(1, "Invalid code");
        // ---
        if (await AuthService.verify_email(email, request_id, code)) {
            Log.summon(0, 'Email verified now you can sign-in');
            $(form).trigger('reset');
        }
    });
});