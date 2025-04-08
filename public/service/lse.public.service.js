import { ECDH } from "../secure/ecdh.js";
import { Bytes } from "../utils/bytes.js";
import { LocalStorage } from "../utils/local.js";
import { SessionStorage } from "../utils/session.js";
import { PasskeyService } from "./passkey.public.service.js";

// local storage encryption
export class LSE {
    // tempo di vita del protocollo (31 giorni) in ms
    static protocol_lifetime = 31 * 24 * 60 * 60 * 1000;
    static curve = "P-384";
    /**
     * Genera una coppia di chiavi ECDH per permettere la crittografia locale
     * ogni coppia puo essere usata per un mese, poi puo cambiata (questo per evitare sovraccarichi)
     * @param {string} [bypass_token=null] token per bypassare la passkey
     * @returns {boolean}
     */
    static async set(bypass_token = null) {
        // -- verifico se è già presente
        const protocol_expire_date = new Date(await LocalStorage.get('lse-private-key-expire-date'));
        // -- se la data di scadenza è valida non ce bisogno di settare una nuova coppia di chiavi
        if (!isNaN(protocol_expire_date) && protocol_expire_date > new Date()) return true;
        // genero due coppie di chiavi
        const ks1 = await ECDH.generate_keys(LSE.curve);
        const ks2 = await ECDH.generate_keys(LSE.curve);
        // ---
        const raw_private_key = ks1.private_key[1];
        const raw_public_key = ks2.public_key[1];
        // -- salvo
        const res = await PasskeyService.authenticate({
            endpoint: 'auth/lse/set',
            body: { public_key: Bytes.base64.encode(raw_public_key), bypass_token },
        });
        if (!res) return false;
        // ---
        await LocalStorage.set('lse-private-key', raw_private_key);
        await LocalStorage.set('lse-private-key-expire-date', Date.now() + LSE.protocol_lifetime);
        // ---
        return true;
    }
    /**
     * Restituisce la chiave simmetrica sfruttando ECDH
     * @param {Uint8Array} public_key chiave pubblica per derivare la chiave locale
     * @param {string} [bypass_token=null] token per bypassare il controllo delle passkey
     * @returns {Uint8Array}
     */
    static async S(provided_public_key = null, bypass_token = null) {
        const raw_private_key = await LocalStorage.get('lse-private-key');
        if (!raw_private_key) return undefined;
        // richiedo al server la chiave pubblica se non è gia stata fornita
        const raw_public_key = 
            provided_public_key instanceof Uint8Array ? 
                // true
                provided_public_key : 
                // false
                await PasskeyService.authenticate({
                    endpoint: 'auth/lse/get',
                    body: { bypass_token }
                }, (response) => {
                    const { public_key } = response;
                    return Bytes.base64.decode(public_key);
                });
        if (!raw_public_key) {
            LocalStorage.remove('lse-private-key');
            return false;
        }
        // -- importo le chiavi come Crypto Key
        const private_key = await ECDH.import_private_key(raw_private_key, LSE.curve);
        const public_key = await ECDH.import_public_key(raw_public_key, LSE.curve);
        // -- calcolo la chiave S
        const secret = await ECDH.derive_shared_secret(private_key, public_key);
        // -- la salvo nel session storage
        SessionStorage.set('lsk', secret);
        // ---
        return secret;
    }
}

// window.LSE = LSE;