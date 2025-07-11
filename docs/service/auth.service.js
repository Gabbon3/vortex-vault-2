import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import { API } from "../utils/api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { ECDH } from "../secure/ecdh.js";
import { VaultService } from "./vault.service.js";
import { SecureLink } from "../utils/secure-link.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { CKE } from "../utils/cke.public.util.js";
import { Windows } from "../utils/windows.js";
import { DPoP } from "../secure/DPoP.client.js";
import { ECDSA } from "../secure/ecdsa.js";

export class AuthService {
    /**
     * Inizializza la sessione calcolando la shared key
     */
    static async init() {
        /**
         * CKE
         */
        Windows.loader(true, "DPoP is starting");
        // ---
        const keyBasic = await CKE.getBasic();
        if (!keyBasic) return false;
        // ---
        const rawPrivateKey = await LocalStorage.get('dpop-private-key', keyBasic);
        const rawPublicKey = await LocalStorage.get('dpop-public-key', keyBasic);
        await DPoP.initRaw({ 
            privateKey: rawPrivateKey, 
            publicKey: rawPublicKey 
        });
        if (!rawPrivateKey) return false;
        // ---
        return true;
    }
    /**
     * Esegue l'accesso
     * @param {string} email 
     * @param {string} password 
     * @param {boolean} [activate_lse=false] true per abilitare il protocollo lse
     * @returns {boolean}
     */
    static async signin(email, password) {
        const obfuscatedPassword = await Cripto.obfuscatePassword(password);
        // -- genero la coppia di chiavi
        // const publicKeyHex = await SHIV.generateKeyPair();
        const ecdsa = new ECDSA();
        const DPoPKeyPair = await ecdsa.generateKeyPair('P-256', true);
        const jwkPublicKey = await ecdsa.exportPublicKeyToJWK(DPoPKeyPair.publicKey);
        // ---
        const res = await API.fetch('/auth/signin', {
            method: 'POST',
            body: {
                email,
                password: obfuscatedPassword,
                jwkPublicKey: jwkPublicKey,
            },
        });
        if (!res) return false;
        // ---
        const { dek: encodedDek, bypassToken } = res;
        /**
         * Inizializzo CKE localmente
         */
        const { keyBasic, keyAdvanced } = await CKE.set(bypassToken);
        if (!keyBasic || !keyAdvanced) return false;
        /**
         * Inizializzo DPoP
         */
        DPoP.init(DPoPKeyPair);
        // salvo e cifro le chiavi localmente
        const rawPrivateKey = await ecdsa.exportPrivateKey(DPoPKeyPair.privateKey)
        const rawPublicKey = await ecdsa.exportPublicKey(DPoPKeyPair.publicKey)
        LocalStorage.set('dpop-private-key', rawPrivateKey, keyBasic);
        LocalStorage.set('dpop-public-key', rawPublicKey, keyBasic);
        // -- derivo la chiave crittografica
        const salt = Bytes.hex.decode(res.salt);
        const KEK = await Cripto.deriveKey(password, salt);
        // ---
        const encryptedDEK = Bytes.base64.decode(encodedDek);
        const DEK = await AES256GCM.decrypt(encryptedDEK, KEK);
        // -- cifro le credenziali sul localstorage
        await LocalStorage.set('email-utente', email);
        await LocalStorage.set('password-utente', password, KEK);
        await LocalStorage.set('master-key', KEK, keyAdvanced);
        await LocalStorage.set('DEK', DEK, keyAdvanced);
        await LocalStorage.set('salt', salt, keyAdvanced);
        // -- imposto quelle in chiaro sul session storage
        SessionStorage.set('master-key', KEK);
        SessionStorage.set('DEK', DEK);
        SessionStorage.set('salt', salt);
        SessionStorage.set('uid', res.uid);
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
        // -- creo la DEK dell'utente
        const DEK = Cripto.randomBytes(32);
        const salt = Cripto.randomBytes(16);
        const KEK = await Cripto.deriveKey(password, salt);
        const encryptedDEK = await AES256GCM.encrypt(DEK, KEK);
        // ---
        const obfuscatedPassword = await Cripto.obfuscatePassword(password);
        // ---
        const res = await API.fetch('/auth/signup', {
            method: 'POST',
            body: { 
                email, 
                password: obfuscatedPassword,
                dek: Bytes.base64.encode(encryptedDEK),
                salt: Bytes.hex.encode(salt)
            },
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
     * Elimina tutti i dati locali, inclusi i cookie
     * @returns {boolean}
     */
    static async deleteAllLocalData() {
        const res = await API.fetch('/auth/clear-cookies', {
            method: 'POST',
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
     * Abilita una sessione avanzata tramite mail
     * @param {string} email 
     * @param {string} code 
     * @returns {boolean}
     */
    static async getShivPrivilegedToken(email, request_id, code) {
        const res = await API.fetch('/shiv/spt', {
            method: 'POST',
            body: { email, request_id, code },
            auth: 'otp'
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Cambio password
     * @param {string} currentPassword Key Encryption Key corrente
     * @param {string} newPassword Nuova Key Encryption Key
     * @returns {boolean} false se: non ce la lsk, non ce l'email, non è andato a buon fine il cambio password
     */
    static async changePassword(newPassword) {
        const ckeKey = SessionStorage.get("cke-key-advanced"); // local storage key
        if (!ckeKey) return false;
        const email = await LocalStorage.get('email-utente');
        if (!email) {
            Log.summon(2, 'No email found, sign in again');
            return false;
        }
        const salt = await SessionStorage.get('salt');
        if (!salt) {
            Log.summon(2, 'No salt, sign in again');
            return false;
        }
        // ---
        /**
         * 
         */
        const newKEK = await VaultService.rotateKEK(email, newPassword, salt);
        if (!newKEK) return false;
        /**
         * Elimino tutte le sessioni SHIV associate tranne la corrente
         */
        await API.fetch('/shiv/session', {
            method: 'DELETE'
        });
        /**
         * ----
         */
        // ---
        return true;
    }
    /**
     * Imposta la chiave master dell'utente nel session storage
     * @param {Uint8Array} ckeKeyAdvanced 
     */
    static async configSessionVariables(ckeKeyAdvanced) {
        const KEK = await LocalStorage.get('master-key', ckeKeyAdvanced);
        const DEK = await LocalStorage.get('DEK', ckeKeyAdvanced);
        const salt = await LocalStorage.get('salt', ckeKeyAdvanced);
        const email = await LocalStorage.get('email-utente');
        if (!KEK || !DEK) return false;
        // ---
        SessionStorage.set('cke', ckeKeyAdvanced);
        SessionStorage.set('master-key', KEK);
        SessionStorage.set('DEK', DEK);
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
        const key = await Cripto.deriveKey(password, salt);
        return Bytes.compare(key, master_key);
    }
    /**
     * Genera una richiesta di accesso rapido
     * @returns {string} url per accedere
     */
    static async request_quick_signin() {
        const password = await LocalStorage.get('password-utente', VaultService.KEK);
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
        const url = `${window.location.protocol}//${window.location.host}/signin?action=qsi&id=${id}&key=${key}`;
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
        // -- pulisco l'url
        window.history.replaceState(null, '', window.location.origin + window.location.pathname);
        // -- eseguo l'accesso passando la passkey
        return await AuthService.signin(email, password);
    }
    /**
     * Genera un qr code da usare su un altro dispositivo per far condividere le credenziali
     */
    static async request_signin() {
        // -- genero una chiave casuale e un id utilizzabile
        const key = Cripto.randomBytes(32, 'base64url');
        const id = await SecureLink.request_id();
        if (!id) return false;
        // ---
        const url = `${window.location.protocol}//${window.location.host}/signin?action=rsi&id=${id}&key=${key}`; // rsi = request sign in
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
     * @returns {boolean|object}
     */
    static check_signin_request_url() {
        const { action, id, key: key_base64 } = Object.fromEntries(new URL(window.location.href).searchParams.entries());
        if (!action || !key_base64 || !id) return false;
        return { action, id, key_base64 };
    }
    /**
     * Dal dispositivo autenticato si inviano le credenziali per accedere
     * @returns {boolean}
     */
    static async check_signin_request() {
        // -- controllo la correttezza dei parametri
        const params = this.check_signin_request_url();
        if (!params) return false;
        if (params.action !== 'rsi') return false;
        const { id, key_base64 } = params;
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
     * @returns {number} true è stato loggato e la sessione è stata attivata, 0 già loggato, -1 nuovo access token non ottenuto, -2 nessuna chiave restituita, false sessione non attivata
     */
    static async start_session() {
        const session_storage_init = SessionStorage.get('master-key') !== null;
        // -- con questa condizione capisco se ce bisogno di accedere o meno
        const signin_need = !session_storage_init;
        // -- nessuna necessita di accedere
        if (!signin_need) return 0;
        // ---
        const ckeKeyAdvanced = await CKE.getAdvanced();
        // -- verifico
        if (!ckeKeyAdvanced) {
            console.warn("CKE non ottenuta.");
            return false;
        }
        // -- imposto le variabili di sessione
        const initialized = await this.configSessionVariables(ckeKeyAdvanced);
        // ---
        return initialized;
    }
    /**
     * Genera una opzione di recupero 
     * @param {string} master_password 
     * @returns {Uint8Array} la chiave privata in formato grezzo
     */
    static async set_up_recovery_method(master_password) {
        // genero due coppie di chiavi
        const ks1 = await ECDH.generate_keys(LSE.curve);
        const ks2 = await ECDH.generate_keys(LSE.curve);
        const private_keys = ks1.private_key;
        const public_keys = ks2.public_key;
        // ---
        const simmetric = await ECDH.derive_shared_secret(private_keys[0], public_keys[0]);
        const encrypted_password = await AES256GCM.encrypt(new TextEncoder().encode(master_password), simmetric);
        // ---
        const result_bytes = msgpack.encode([encrypted_password, public_keys[1]]);
        // ---
        const res = await API.fetch('/auth/new-recovery', {
            method: 'POST',
            body: result_bytes,
        }, {
            content_type: 'bin'
        });
        // ---
        if (!res) return false;
        return private_keys[1];
    }
    /**
     * Restituisce la password dell'utente se il codice è corretto
     * @param {string} email
     * @param {Uint8Array} private_key 
     * @returns {string} Returns
     */
    static async master_password_recovery(email, private_key, request_id, code) {
        const res = await API.fetch(`/auth/recovery`, {
            method: 'POST',
            body: { request_id, code }
        });
        if (!res) return false;
        // ---
        const recovery = new Uint8Array(res.recovery.data);
        const [encrypted_password, public_key] = msgpack.decode(recovery);
        // ---
        const imported_private_key = await ECDH.import_private_key(private_key, LSE.curve);
        const imported_public_key = await ECDH.import_public_key(public_key, LSE.curve);
        // ---
        const simmetric = await ECDH.derive_shared_secret(imported_private_key, imported_public_key);
        try {
            const master_password_bytes = await AES256GCM.decrypt(encrypted_password, simmetric);
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

// window.AuthService = AuthService;