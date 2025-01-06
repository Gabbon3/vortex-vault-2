import { PasskeyService } from "../service/passkey.public.service.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

document.addEventListener("DOMContentLoaded", async () => {
    /**
     * NEW PASSKEY
     */
    document.getElementById('btn-new-passkey').addEventListener("click", async () => {
        const email = await LocalStorage.get('email-utente');
        if (!email) return Log.summon(1, 'Any email founded');
        // ---
        const passkey_added = await PasskeyService.activate_new_passkey(email);
        if (passkey_added) Log.summon(0, 'New passkey added to your account');
    });
});

export class PasskeyUI {
    
}