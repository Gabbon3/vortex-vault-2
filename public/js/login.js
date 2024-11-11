import { Auth } from "../utils/auth.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";

$(document).ready(async () => {
    /**
     * Provo ad accedere automaticamente
     */
    const session_started = await Auth.start_session();
    if (session_started) {
        const saved_username = await LocalStorage.get('username-utente');
        if (confirm(`Accesso salvato come ${saved_username}, vuoi continuare?`)) window.location.href = '/vortexvault';
    }
    /**
     * LOGIN
     */
    $('#accedi').on('submit', async (e) => {
        e.preventDefault();
        // ---
        const { username, password } = Form.get_data(e.currentTarget);
        // ---
        await Auth.login(username, password);
    });
});