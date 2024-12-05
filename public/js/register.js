import { finestra } from "../components/main.components.js";
import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
    /**
     * REGISTER
     */
    Form.onsubmit('registrati', async (form, elements) => {
        const { username, password, password2 } = elements;
        // -- controllo sulle password
        if (password !== password2) return Log.summon(1, 'Passwords doesn\'t match');;
        // ---
        finestra.loader(true);
        if (await AuthService.register(username, password)) {
            $(form).trigger('reset');
            Log.summon(0, `${username}, you have been successfully registered`);
        }
        finestra.loader(false);
    });
});