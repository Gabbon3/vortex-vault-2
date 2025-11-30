import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { SessionStorage } from "../utils/session.js";
import { LocalStorage } from "../utils/local.js";
import { API } from "../utils/api.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { VaultService } from "./vault.service.js";
import { SecureLink } from "../utils/secure-link.js";
import { QrCodeDisplay } from "../utils/qrcode-display.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { PoP } from "../secure/PoP.js";

export class AuthService {
    /**
     * Inizializza la sessione calcolando la shared key
     */
    static async init() {
        Windows.loader(true, "Verifico la sessione");
        const popInitialized = await PoP.init();
        if (!popInitialized) return false;
        const authInitialized = await this.startSessionWithPoP();
        return popInitialized && authInitialized;
    }
    /**
     * Esegue l'accesso
     * @param {string} email
     * @param {string} password
     * @returns {boolean}
     */
    static async signin(email, password) {
        // -- genero la coppia di chiavi
        const publicKeyB64 = await PoP.generateKeyPair();
        const obfuscatedPassword = await Cripto.obfuscatePassword(password);
        // ---
        const res = await API.fetch("/auth/signin", {
            method: "POST",
            body: {
                email,
                password: obfuscatedPassword,
                publicKey: publicKeyB64,
            },
            skipRefresh: true,
        });
        if (!res) return false;
        // ---
        const { dek: encodedDek } = res;
        // -- derivo la chiave crittografica
        const salt = Bytes.hex.decode(res.salt);
        // ---
        const rawKEK = await Cripto.deriveKey(password, salt);
        const KEK = await AES256GCM.importAesGcmKey(rawKEK, false);
        // ---
        const encryptedDEK = Bytes.base64.decode(encodedDek);
        const rawDEK = await AES256GCM.decrypt(encryptedDEK, KEK);
        const DEK = await AES256GCM.importAesGcmKey(rawDEK, false);
        // -- imposto in chiaro sul session storage
        SessionStorage.set(
            "access-token-expiry",
            new Date(Date.now() + 15 * 60 * 1000)
        );
        LocalStorage.set("salt", salt);
        LocalStorage.set("email", email);
        LocalStorage.set("password", password, KEK);
        await VaultService.keyStore.saveKey(KEK, "KEK");
        await VaultService.keyStore.saveKey(DEK, "DEK");
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
        const tempKEK = await AES256GCM.importAesGcmKey(KEK, false);
        const encryptedDEK = await AES256GCM.encrypt(DEK, tempKEK);
        // ---
        const obfuscatedPassword = await Cripto.obfuscatePassword(password);
        // ---
        const res = await API.fetch("/auth/signup", {
            method: "POST",
            body: {
                email,
                password: obfuscatedPassword,
                dek: Bytes.base64.encode(encryptedDEK),
                salt: Bytes.hex.encode(salt),
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
        const res = await API.fetch("/auth/signout", {
            method: "POST",
        });
        if (!res) return false;
        // ---
        localStorage.clear();
        sessionStorage.clear();
        PoP.clearKeystore();
        return true;
    }
    /**
     * Elimina tutti i dati locali, inclusi i cookie
     * @returns {boolean}
     */
    static async deleteAllLocalData() {
        const res = await API.fetch("/auth/clear-cookies", {
            method: "POST",
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
        const res = await API.fetch("/auth/verify-account", {
            method: "POST",
            body: { email, request_id, code },
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
    static async enableAdvancedSession(email, request_id, code) {
        const res = await API.fetch("/auth/advanced", {
            method: "POST",
            body: { email, request_id, code },
            auth: "otp",
        });
        // ---
        if (!res) return false;
        SessionStorage.set(
            "access-token-expiry",
            new Date(Date.now() + 7 * 60 * 1000)
        );
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
        const email = await LocalStorage.get("email");
        if (!email) {
            Log.summon(2, "No email found, sign in again");
            return false;
        }
        const salt = await LocalStorage.get("salt");
        if (!salt) {
            Log.summon(2, "No salt, sign in again");
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
        await API.fetch("/shiv/session", {
            method: "DELETE",
        });
        /**
         * ----
         */
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
        const master_key = await SessionStorage.get("master-key");
        const salt = await LocalStorage.get("salt");
        // ---
        const key = await Cripto.deriveKey(password, salt);
        return Bytes.compare(key, master_key);
    }
    /**
     * Genera una richiesta di accesso rapido
     * @returns {string} url per accedere
     */
    static async request_quick_signin() {
        const password = await LocalStorage.get(
            "password",
            VaultService.KEK
        );
        if (!password) return null;
        // ---
        const email = await LocalStorage.get("email");
        const { id, key } = await SecureLink.generate({
            scope: "qsi",
            ttl: 60 * 3,
            data: [email, password],
        });
        // -- compongo l'url
        const url = `${window.location.protocol}//${window.location.host}/signin?action=qsi&id=${id}&key=${key}`;
        return url;
    }
    /**
     * Genera un token per accedere velocemente all'estensione di chrome
     */
    static async requestExtensionTokenSignIn() {
        const password = await LocalStorage.get(
            "password",
            VaultService.KEK
        );
        if (!password) return null;
        // ---
        const email = await LocalStorage.get("email");
        const { id, key } = await SecureLink.generate({
            scope: "ext-signin",
            ttl: 60 * 3,
            data: [email, password],
        });
        // ---
        return Bytes.base32.encode(new TextEncoder().encode(`${id}.${key}`));
    }
    /**
     * Restituisce le credenziali utente
     * @returns {boolean}
     */
    static async quick_signin() {
        // -- verifico se ce bisogno di eseguire questa operazione
        const {
            action,
            id,
            key: key_base64,
        } = Object.fromEntries(
            new URL(window.location.href).searchParams.entries()
        );
        if (!action || action !== "qsi") return false;
        if (!id || !key_base64) return false;
        // -- ottengo dal server le credenziali
        const [email, password] = await SecureLink.get("qsi", id, key_base64);
        if (!email || !password) return false;
        // -- pulisco l'url
        window.history.replaceState(
            null,
            "",
            window.location.origin + window.location.pathname
        );
        // -- eseguo l'accesso passando la passkey
        return await AuthService.signin(email, password);
    }
    /**
     * Genera un qr code da usare su un altro dispositivo per far condividere le credenziali
     */
    static async request_signin() {
        // -- genero una chiave casuale e un id utilizzabile
        const key = Cripto.randomBytes(32, "base64url");
        const id = await SecureLink.request_id();
        if (!id) return false;
        // ---
        const url = `${window.location.protocol}//${window.location.host}/signin?action=rsi&id=${id}&key=${key}`; // rsi = request sign in
        QrCodeDisplay.generate({
            data: url,
        });
        navigator.clipboard.writeText(url);
        Log.summon(3, "Link copied into your clipboard");
        return { key, id };
    }
    /**
     * Verifica e accede se da una richiesta di autenticazione ce stata una risposta
     * @param {string} id
     * @param {Uint8Array} key
     * @returns {boolean}
     */
    static async check_signin_response(id, key) {
        const [email, password] = await SecureLink.get("rsi", id, key);
        if (!email || !password) return false;
        // -- eseguo l'accesso passando la passkey
        return await AuthService.signin(email, password, id);
    }
    /**
     * Controlla solo l'url
     * @returns {boolean|object}
     */
    static check_signin_request_url() {
        const {
            action,
            id,
            key: key_base64,
        } = Object.fromEntries(
            new URL(window.location.href).searchParams.entries()
        );
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
        if (params.action !== "rsi") return false;
        const { id, key_base64 } = params;
        // ---
        const key = Bytes.base64.decode(key_base64, true);
        // -- recupero la password
        const master_key = SessionStorage.get("master-key");
        if (!master_key) {
            console.warn("Master key not found");
            return null;
        }
        // ---
        const password = await LocalStorage.get("password", master_key);
        if (!password) return null;
        // ---
        const email = await LocalStorage.get("email");
        const res = await SecureLink.generate({
            key,
            id,
            scope: "rsi",
            ttl: 60 * 3,
            data: [email, password],
            passKey: true,
        });
        if (!res) return false;
        // -- pulisco l'url
        window.history.replaceState(
            null,
            "",
            window.location.origin + window.location.pathname
        );
        // ---
        return true;
    }
    /**
     * Refresha l'access token in automatico usando la chiave privata pop
     * @returns {boolean} true è stato loggato e la sessione è stata attivata, 0 già loggato, -1 nuovo access token non ottenuto, -2 nessuna chiave restituita, false sessione non attivata
     */
    static async startSessionWithPoP() {
        const accessTokenExpiry = SessionStorage.get("access-token-expiry");
        if (accessTokenExpiry) return true;
        // ---
        const accessTokenRefreshed = await PoP.refreshAccessToken();
        if (!accessTokenRefreshed) return false;
        // -- imposto le variabili di sessione
        SessionStorage.set("email", await LocalStorage.get("email"));
        SessionStorage.set("salt", await LocalStorage.get("salt"));
        return true;
    }
}

// window.AuthService = AuthService;
