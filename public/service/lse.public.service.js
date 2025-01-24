import { ECDH } from "../secure/ecdh.js";
import { Bytes } from "../utils/bytes.js";
import { LocalStorage } from "../utils/local.js";
import msgpack from "../utils/msgpack.min.js";
import { PasskeyService } from "./passkey.public.service.js";

// local storage encryption
export class LSE {
    /**
     * Genera una coppia di chiavi ECDH per memorizzare dati sul db
     * @returns {boolean}
     */
    static async set() {
        // genero due coppie di chiavi
        const ks1 = await ECDH.generate_keys();
        const ks2 = await ECDH.generate_keys();
        const private_key = ks1.exported_keys.private_key;
        const public_key = ks2.exported_keys.public_key;
        // -- salvo
        const res = await PasskeyService.authenticate({
            endpoint: 'auth/lse/set',
            body: { public_key: Bytes.base64.encode(public_key) },
        });
        if (!res) return false;
        // ---
        await LocalStorage.set('lse-private-key', private_key);
        // ---
        return true;
    }
    /**
     * Restituisce la chiave simmetrica sfruttando ECDH
     * @returns {Uint8Array}
     */
    static async get_s() {
        const raw_private_key = await LocalStorage.get('lse-private-key');
        if (!raw_private_key) return undefined;
        // richiedo al server la chiave pubblica
        const raw_public_key = await PasskeyService.authenticate({
            endpoint: 'auth/lse/get',
        }, (response) => {
            const { public_key } = response;
            return Bytes.base64.decode(public_key);
        });
        if (!raw_public_key) return false;
        // -- importo le chiavi come Crypto Key
        const private_key = await ECDH.import_private_key(raw_private_key);
        const public_key = await ECDH.import_public_key(raw_public_key);
        // -- calcolo la chiave S
        const secret = await ECDH.derive_shared_secret(private_key, public_key);
        return secret;
    }
}

window.LSE = LSE;