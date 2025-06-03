import { PasskeyService } from "../service/passkey.public.service.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";

document.addEventListener("DOMContentLoaded", async () => {
    /**
     * PAGINA VAULT
     */
    if (window.location.pathname !== '/vortex-vault-2/vault.html') return;
    /**
     * NEW PASSKEY
     */
    document.getElementById('btn-new-passkey').addEventListener("click", async () => {
        const email = await LocalStorage.get('email-utente');
        if (!email) return Log.summon(1, 'No email found');
        // ---
        const passkey_added = await PasskeyService.activate_new_passkey(email);
        if (passkey_added) Log.summon(0, 'New passkey added to your account');
    });
    /**
     * SYNC LIST
     */
    document.getElementById('btn-list-passkey').addEventListener("click", async () => {
        Windows.loader(true);
        PasskeyUI.list();
        Windows.loader(false);
    });
});

export class PasskeyUI {
    static async init() {
        this.list();
    }
    /**
     * Stampa la lista delle passkey
     * @returns 
     */
    static async list() {
        const passkeys = await PasskeyService.list();
        if (!passkeys) return false;
        // ---
        let html = '';
        for (const passkey of passkeys) {
            html += `<passkey-list-item 
                passkey-id="${passkey.id}"
                name="${passkey.name}"
                updated-at="${passkey.updated_at}"
                created-at="${passkey.created_at}"
                ></passkey-list-item>`
        }
        document.getElementById("passkey-list").innerHTML = html;
    }
}