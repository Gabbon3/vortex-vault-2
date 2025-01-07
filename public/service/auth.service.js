import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import { API } from "../utils/api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { BackupService } from "./backup.service.js";
import { VaultService } from "./vault.service.js";
import { SecureLink } from "../utils/secure-link.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { PasskeyService } from "./passkey.public.service.js";
import { Log } from "../utils/log.js";

export class AuthService {
    /**
     * Esegue l'accesso
     * @param {string} email 
     * @param {string} password 
     * @returns {boolean}
     */
    static async signin(email, password, passKey = null) {
        const res = await API.fetch('/auth/signin', {
            method: 'POST',
            body: { email, password, passKey },
        });
        if (!res) return false;
        // -- derivo la chiave crittografica
        const salt = Bytes.hex.decode(res.salt);
        const key = await Cripto.derive_key(password, salt);
        // -- cifro le credenziali sul localstorage
        const cke_key = Bytes.base64.decode(res.key);
        await LocalStorage.set('email-utente', email);
        await LocalStorage.set('password-utente', password, key);
        await LocalStorage.set('master-key', key, cke_key);
        await LocalStorage.set('salt', salt, cke_key);
        SessionStorage.set('master-key', key);
        SessionStorage.set('salt', salt);
        // --- imposto la scadenza dell'access token
        await LocalStorage.set('session-expire', new Date(Date.now() + 3600000));
        // ---
        return true;
    }
    /**
     * Esegue la registrazione di un nuovo utente
     * @param {string} email 
     * @param {string} password 
     * @returns {boolean}
     */
    static async register(email, password) {
        const res = await API.fetch('/auth/registrati', {
            method: 'POST',
            body: { email, password },
        });
        if (!res) return false;
        // -- cifro le credenziali sul localstorage
        return true;
    }
    /**
     * Effettua il logout eliminando ogni traccia dell'utente dal client
     */
    static async signout() {
        const res = await API.fetch('/auth/signout', {
            method: 'POST',
        });
        if (!res) return false;
        // ---
        localStorage.clear();
        sessionStorage.clear();
        return true;
    }
    /**
     * Effettua la cancellazione di un account
     */
    static async delete_account(request_id, code) {
        const res = await API.fetch('/auth/delete', {
            method: "POST",
            body: { request_id, code }
        });
        if (!res) return false;
        // ---
        localStorage.clear();
        sessionStorage.clear();
        return true;
    }
    /**
     * Verifica un email
     * @param {string} email 
     * @param {string} code 
     * @returns {boolean}
     */
    static async verify_account(email, request_id, code) {
        const res = await API.fetch('/auth/verify-account', {
            method: 'POST',
            body: { email, request_id, code }
        });
        // ---
        if (!res) return false;
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
        const cke_key = Bytes.base64.decode(res.key);
        await LocalStorage.set('master-key', key, cke_key);
        await SessionStorage.set('master-key', key);
        // -- creo e genero un backup per l'utente
        await BackupService.create_locally();
        // ---
        return true;
    }
    /**
     * Attiva l'autenticazione a due fattori
     * @param {string} request_id - id richiesta de codice email
     * @param {string} code - email code
     * @returns {boolean}
     */
    static async enable_mfa(email, request_id, code) {
        const res = await API.fetch('/auth/mfa', {
            method: 'POST',
            body: { email, request_id, code }
        });
        // ---
        if (!res) return false;
        return res.secret;
    }
    /**
     * Cerca di ottenere un nuovo access token
     * @returns {boolean|object} restituisce un oggetto con degli auth data (la cke), false se non rigenerato
     */
    static async new_access_token() {
        const key = await PasskeyService.authenticate(
            '/auth/token/refresh',
            'POST',
            (response) => {
                return Bytes.base64.decode(response.key);
            }
        );
        if (!key) return false;
        // -- imposto la scadenza dell'access token
        await LocalStorage.set('session-expire', new Date(Date.now() + 3600000));
        return { key };
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
        return Bytes.base64.decode(res.key);
    }
    /**
     * Imposta la chiave master dell'utente nel session storage
     * @param {Uint8Array} key 
     */
    static async config_session_vars(key) {
        const master_key = await LocalStorage.get('master-key', key);
        const salt = await LocalStorage.get('salt', key);
        const email = await LocalStorage.get('email-utente');
        if (!master_key) return false;
        // ---
        SessionStorage.set('master-key', master_key);
        SessionStorage.set('salt', salt);
        SessionStorage.set('email', email);
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
     * Genera una richiesta di accesso rapido
     * @returns {string} url per accedere
     */
    static async request_quick_signin() {
        const password = await LocalStorage.get('password-utente', VaultService.master_key);
        if (!password) return null;
        // ---
        const email = await LocalStorage.get('email-utente');
        const { id, key } = await SecureLink.generate({
            scope: 'qsi',
            ttl: 60 * 3,
            data: [email, password],
            passKey: true,
        });
        // -- compongo l'url
        const url = `https://vortexvault.fly.dev/signin?action=qsi&id=${id}&key=${key}`;
        return url;
    }
    /**
     * Restituisce le credenziali utente
     * @returns {boolean}
     */
    static async quick_signin() {
        // -- verifico se ce bisogno di eseguire questa operazione
        const { action, id, key: key_base64 } = Object.fromEntries(new URL(window.location.href).searchParams.entries());
        if (!action || action !== 'qsi') return false;
        if (!id || !key_base64) return false;
        // -- ottengo dal server le credenziali
        const [email, password] = await SecureLink.get('qsi', id, key_base64);
        if (!email || !password) return false;
        window.history.replaceState(null, '', window.location.origin + window.location.pathname);
        // -- eseguo l'accesso passando la passkey
        return await AuthService.signin(email, password, id);
    }
    /**
     * Genera un qr code da usare su un altro dispositivo per far condividere le credenziali
     */
    static async request_signin() {
        // -- genero una chiave casuale e un id utilizzabile
        const key = Cripto.random_bytes(32, 'base64url');
        const id = await SecureLink.request_id();
        if (!id) return false;
        // ---
        const url = `https://vortexvault.fly.dev/signin?action=rsi&id=${id}&key=${key}`; // rsi = request sign in
        QrCodeDisplay.generate({
            data: url,
        });
        navigator.clipboard.writeText(url);
        Log.summon(3, 'Link copied into your clipboard');
        return { key, id };
    }
    /**
     * Verifica e accede se da una richiesta di autenticazione ce stata una risposta
     * @param {string} id 
     * @param {Uint8Array} key 
     * @returns {boolean}
     */
    static async check_signin_response(id, key) {
        const [email, password] = await SecureLink.get('rsi', id, key);
        if (!email || !password) return false;
        // -- eseguo l'accesso passando la passkey
        return await AuthService.signin(email, password, id);
    }
    /**
     * Controlla solo l'url
     * @returns {boolean}
     */
    static check_signin_request_url() {
        const { action, id, key: key_base64 } = Object.fromEntries(new URL(window.location.href).searchParams.entries());
        if (!action || action !== 'rsi' || !key_base64 || !id) return false;
        return true;
    }
    /**
     * Dal dispositivo autenticato si inviano le credenziali per accedere
     * @returns {boolean}
     */
    static async check_signin_request() {
        // -- controllo la correttezza dei parametri
        if (!this.check_signin_request_url()) return false;
        // ---
        const key = Bytes.base64.decode(key_base64, true);
        // -- recupero la password
        const master_key = SessionStorage.get('master-key');
        if (!master_key) {
            console.warn("Master key not found");
            return null;
        }
        // ---
        const password = await LocalStorage.get('password-utente', master_key);
        if (!password) return null;
        // ---
        const email = await LocalStorage.get('email-utente');
        const res = await SecureLink.generate({
            key,
            id,
            scope: 'rsi',
            ttl: 60 * 3,
            data: [email, password],
            passKey: true,
        });
        if (!res) return false;
        // -- pulisco l'url
        window.history.replaceState(null, '', window.location.origin + window.location.pathname);
        // ---
        return true;
    }
    /**
     * Tenta di avviare automaticamente una sessione
     * @returns {number} 0 già loggato, -1 nuovo access token non ottenuto, -2 nessuna chiave restituita
     */
    static async start_session() {
        // -- verifico che ce bisogno di rigenerare l'access token
        const access_token_expire = await LocalStorage.get('session-expire');
        const session_storage_init = SessionStorage.get('master-key') !== null;
        // -- con questa condizione capisco se ce bisogno di accedere o meno
        const signin_need = !access_token_expire || Date.now() > access_token_expire.getTime() || !session_storage_init;
        // -- nessuna necessita di accedere
        if (!signin_need) return 0;
        // -- provo ad ottenere le informazioni per accedere (la chiave)
        const auth_data = await this.new_access_token();
        // -- se non è stato generato un nuovo access token fermo
        // - l'utente dovrebbe accedere nuovamente
        if (!auth_data) return -1;
        // -- se non ce la chiave mi fermo
        if (!auth_data.key) return -2;
        // ---
        const { key } = auth_data;
        // -- imposto la master key
        const initialized = await this.config_session_vars(key);
        // ---
        return initialized;
    }
    /**
     * Genera e cifra la master password dell'utente con un codice di recupero
     * @param {string} master_password 
     */
    static async generate_recovery_code(master_password) {
        const code = Cripto.random_alphanumeric_code(20);
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
    static async master_password_recovery(email, sudo_code) {
        const res = await API.fetch(`/auth/recovery/${email}`, {
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
     * @param {string} email 
     * @param {string} code 
     */
    static async device_recovery_mfa(email, code) {
        const res = await API.fetch('/auth/token/unlock', {
            method: 'POST',
            body: { email, code }
        });
        if (!res) return false;
        return res.message;
    }
    /**
     * Recovery a device by using email
     * @param {string} email 
     * @param {string} request_id 
     * @param {string} code 
     */
    static async device_recovery_email(email, request_id, code) {
        const res = await API.fetch('/auth/token/unlockwithemail', {
            method: 'POST',
            body: { email, request_id, code }
        });
        if (!res) return false;
        return res.message;
    }
}

window.AuthService = AuthService;