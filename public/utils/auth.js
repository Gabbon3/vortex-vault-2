import { Bytes } from "./bytes.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Cripto } from "../secure/cripto.js";
import { SessionStorage } from "./session.js";
import { LocalStorage } from "./local.js";
import { API } from "./api.js";

export class Auth {
    /**
     * Esegue l'accesso
     * @param {string} username 
     * @param {string} password 
     * @returns {boolean}
     */
    static async login(username, password) {
        const res = await API.fetch('/auth/accedi', {
            method: 'POST',
            body: { username, password },
        });
        if (!res) return false;
        // -- derivo la chiave crittografica
        const key = await Cripto.derive_key(password, Bytes.hex.from(res.salt));
        // -- cifro le credenziali sul localstorage
        const cke_buffer = Bytes.base64.from(res.cke);
        await LocalStorage.set('username-utente', username);
        await LocalStorage.set('master-key', key, cke_buffer);
        // --- imposto la scadenza dell'access token
        await LocalStorage.set('access-token-expire', new Date(Date.now() + 3600000));
        // ---
        return true;
    }
    /**
     * Esegue la registrazione di un nuovo utente
     * @param {string} username 
     * @param {string} password 
     * @returns {boolean}
     */
    static async register(username, password) {
        const res = await API.fetch('/auth/registrati', {
            method: 'POST',
            body: { username, password },
        });
        if (!res) return false;
        // -- cifro le credenziali sul localstorage
        return true;
    }
    /**
     * Cerca di ottenere un nuovo access token
     * @returns {boolean} true se rigenerato, false se non rigenerato
     */
    static async new_access_token() {
        const res = await API.fetch('/auth/token/refresh', {
            method: 'POST',
        });
        if (!res) return false;
        // -- imposto la scadenza dell'access token
        LocalStorage.set('access-token-expire', new Date(Date.now() + 3600000));
        return true;
    }
    /**
     * Recupera la cke dai cookie
     * @returns {Promise<Uint8Array>} 
     */
    static async get_cke() {
        const res = await API.fetch('/auth/cke', {
            method: 'GET'
        });
        if (!res) return null;
        return Bytes.base64.from(res.cke);
    }
    /**
     * Imposta la chiave master dell'utente nel session storage
     * @param {Uint8Array} cke 
     */
    static async set_master_key(cke) {
        const master_key = await LocalStorage.get('master-key', cke);
        if (!master_key) return false;
        // ---
        SessionStorage.set('master-key', master_key);
        // ---
        return true;
    }
    /**
     * Tenta di avviare automaticamente una sessione
     * @returns {boolean}
     */
    static async start_session() {
        // -- verifico che ce bisogno di rigenerare l'access token
        const access_token_expire = await LocalStorage.get('access-token-expire');
        if (Date.now() > access_token_expire || !access_token_expire) {
            const created = await this.new_access_token();
            // -- se non è stato generato un nuovo access token fermo
            // - l'utente dovrebbe accedere nuovamente
            if (!created) return false;
        }
        // -- recupero la cke
        const cke = await this.get_cke();
        // -- se non è stato possibile ottenere la cke, l'utente dovrebbe accedere nuovamente
        if (!cke) return false;
        // -- imposto la master key
        this.set_master_key(cke);
        // ---
        return true;
    }
}

window.Auth = Auth;