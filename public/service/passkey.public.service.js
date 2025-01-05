import { Bytes } from "../../utils/bytes.js";
import { API } from "../utils/api.js";
import msgpack from "../utils/msgpack.min.js";
import cborJs from "../utils/cbor.js";

export class PasskeyService {
    static async request_new_passkey(email) {
        const options = await API.fetch(`/auth/passkey/register/${email}`, {
            method: 'GET',
        });
        if (!options) return false;
        // ---
        const publicKey = {
            ...options,
            challenge: Bytes.base64.from(options.challenge),
            user: {
                ...options.user,
                id: Bytes.bigint.from(BigInt(options.user.id))
            }
        };
        const credential_ = await navigator.credentials.create({ publicKey });
        if (!credential_) return null;
        // ---
        const credential = {
            id: credential_.id,
            rawId: new Uint8Array(credential_.rawId),
            response: {
                attestationObject: new Uint8Array(credential_.response.attestationObject),
                clientDataJSON: new Uint8Array(credential_.response.clientDataJSON),
            },
            type: credential_.type,
            email,
        }
        // const essentials = {
        //     id: 
        // }
        console.log(credential);
        return;
        // ---
        // --- completo la registrazione
        const res = await API.fetch('/auth/passkey/register', {
            method: 'POST',
            body: { data: Bytes.base64.to(msgpack.encode(credential)) }
        });
        // ---
        console.log(res);
        if (!res) return false;
        return true;
    }
}

window.PasskeyService = PasskeyService;

document.addEventListener('DOMContentLoaded', async () => {
    await PasskeyService.request_new_passkey('2004gabbo@gmail.com')
})