import { AuthService } from "../service/auth.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
    /**
     * Provo ad accedere automaticamente
     */
    const session_started = await AuthService.start_session();
    if (session_started) {
        const saved_username = await LocalStorage.get('username-utente');
        if (confirm(`Accesso salvato come ${saved_username}, vuoi continuare?`)) window.location.href = '/vault';
    }
    /**
     * LOGIN
     */
    Form.onsubmit('accedi', async (form, elements) => {
        const { username, password } = elements;
        // ---
        if (await AuthService.login(username, password)) {
            $(form).trigger('reset');
            Log.summon(0, `Autenticato come ${username}`);
        }
    });
});