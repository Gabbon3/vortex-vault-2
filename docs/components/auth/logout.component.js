import { AuthService } from "../../service/auth.service.js";
import { Log } from "../../utils/log.js";
import { Windows } from "../../utils/windows.js";

class LogoutButton extends HTMLElement {
    constructor() {
        super();
    }

    render() {
        this.innerHTML = `<span class="material-symbols-rounded">logout</span>Sign-out`;
        this.addEventListener('click', async () => {
            if (!confirm('Confermi di voler effettuare la disconnessione?')) return;
            // ---
            const signed_out = await AuthService.signout();
            if (signed_out) {
                Log.summon(0, 'Disconnesso con successo, verrai reindirizzato alla pagina di accesso');
                Windows.loader(true, "Reindirizzamento alla pagina di accesso");
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 3000);
            }
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("logout-btn", LogoutButton);