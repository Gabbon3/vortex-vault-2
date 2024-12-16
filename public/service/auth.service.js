import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import { API } from "../utils/api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { BackupService } from "./backup.service.js";
import { VaultService } from "./vault.service.js";

export class AuthService {
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
        const salt = Bytes.hex.from(res.salt);
        const key = await Cripto.derive_key(password, salt);
        // -- cifro le credenziali sul localstorage
        const cke_buffer = Bytes.base64.from(res.cke);
        await LocalStorage.set('username-utente', username);
        await LocalStorage.set('master-key', key, cke_buffer);
        await LocalStorage.set('salt', salt, cke_buffer);
        SessionStorage.set('master-key', key);
        SessionStorage.set('salt', salt);
        // --- imposto la scadenza dell'access token
        await LocalStorage.set('session-expire', new Date(Date.now() + 3600000));
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
     * Cambio password
     * @param {string} old_password 
     * @param {string} new_password 
     * @returns {boolean}
     */
    static async change_password(old_password, new_password) {
        const res = await API.fetch('/auth/password', {
            method: 'POST',
            body: { old_password, new_password },
        });
        if (!res) return false;
        // -- imposto la master key
        const salt = await SessionStorage.get('salt');
        const key = await Cripto.derive_key(new_password, salt);
        VaultService.master_key = key;
        // -- la salvo localmente
        const cke_buffer = Bytes.base64.from(res.cke);
        await LocalStorage.set('master-key', key, cke_buffer);
        await SessionStorage.set('master-key', key);
        // -- creo e genero un backup per l'utente
        await BackupService.create_locally();
        // ---
        return true;
    }
    /**
     * Attiva l'autenticazione a due fattori
     * @returns {boolean}
     */
    static async enable_mfa(password) {
        const res = await API.fetch('/auth/mfa', {
            method: 'POST',
            body: { password }
        });
        // ---
        if (!res) return false;
        return res.secret;
    }
    /**
     * Start sudo session that release an advanced access token
     * that allow the user to perform critical actions
     * @param {string} code mfa code
     * @returns {boolean}
     */
    static async start_sudo_session(code) {
        const res = await API.fetch('/auth/sudotoken', {
            method: 'POST',
            body: { code }
        });
        if (!res) return false;
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
        await LocalStorage.set('session-expire', new Date(Date.now() + 3600000));
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
    static async config_session_vars(cke) {
        const master_key = await LocalStorage.get('master-key', cke);
        const salt = await LocalStorage.get('salt', cke);
        const username = await LocalStorage.get('username-utente');
        if (!master_key) return false;
        // ---
        SessionStorage.set('master-key', master_key);
        SessionStorage.set('salt', salt);
        SessionStorage.set('username', username);
        // ---
        return true;
    }
    /**
     * Verifica localmente se la password passata come parametro corrisponde a quella effettiva dell'utente
     * alleggerendo il server
     * @param {string} password 
     * @returns {boolean} 
     */
    static async verify_master_password(password) {
        const master_key = await SessionStorage.get('master-key');
        const salt = await SessionStorage.get('salt');
        // ---
        const key = await Cripto.derive_key(password, salt);
        return Bytes.compare(key, master_key);
    }
    /**
     * Tenta di avviare automaticamente una sessione
     * @returns {boolean}
     */
    static async start_session() {
        // -- verifico che ce bisogno di rigenerare l'access token
        const access_token_expire = await LocalStorage.get('session-expire');
        if (!access_token_expire || Date.now() > access_token_expire.getTime()) {
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
        this.config_session_vars(cke);
        // ---
        return true;
    }
    /**
     * Genera e cifra la master password dell'utente con un codice di recupero
     * @param {string} master_password 
     */
    static async generate_recovery_code(master_password) {
        const code = Cripto.random_recovery_code();
        const salt = Cripto.random_bytes(16);
        const master_password_bytes = new TextEncoder().encode(master_password);
        // ---
        const key = await Cripto.derive_key(code, salt);
        const encrypted_password = await AES256GCM.encrypt(master_password_bytes, key);
        const result_bytes = Bytes.merge([salt, encrypted_password], 8);
        // ---
        const res = await API.fetch('/auth/recovery', {
            method: 'POST',
            body: result_bytes,
        }, {
            content_type: 'bin'
        });
        // ---
        if (!res) return false;
        return code;
    }
    /**
     * Restituisce la password dell'utente se il codice è corretto
     * @param {string} sudo_code 
     * @returns {string} Returns
     */
    static async master_password_recovery(username, sudo_code) {
        const res = await API.fetch(`/auth/recovery/${username}`, {
            method: 'GET',
        });
        if (!res) return false;
        // ---
        const recovery = new Uint8Array(res.recovery.data);
        const salt = recovery.subarray(0, 16);
        const encrypted_password = recovery.subarray(16);
        // ---
        const key = await Cripto.derive_key(sudo_code, salt);
        try {
            const master_password_bytes = await AES256GCM.decrypt(encrypted_password, key);
            const master_password = new TextDecoder().decode(master_password_bytes);
            // ---
            return master_password;
        } catch (error) {
            console.warn(error);
            return null;
        }
    } 
    /**
     * Recovery a device by using mfa
     * @param {string} username 
     * @param {string} code 
     */
    static async device_recovery(username, code) {
        const res = await API.fetch('/auth/token/unlock', {
            method: 'POST',
            body: { username, code }
        });
        if (!res) return false;
        return res.message;
    }
}

window.Auth = AuthService;