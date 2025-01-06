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
            challenge: Bytes.base64.decode(options.challenge),
            user: {
                ...options.user,
                id: Bytes.bigint.encode(BigInt(options.user.id))
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
        // ---------------------------
        // const credential = msgpack.decode(Bytes.base64.from('haJpZLZwVGJxUVN6TE9yQnVNc0hvdmN0Q1NnpXJhd0lk2BKlNupBLMs6sG4ywei9y0JKqHJlc3BvbnNlgrFhdHRlc3RhdGlvbk9iamVjdMeyEqNjZm10ZG5vbmVnYXR0U3RtdKBoYXV0aERhdGFYlEmWDeWIDoxodDQXD2R2YFuP5K65ooYyx5lc87qDHZdjXQAAAADqm41mTQEdITzktrSMtXXUABClNupBLMs6sG4ywei9y0JKpQECAyYgASFYILvYzppiqhsZ/XwZZyinD+KOB2Gc13EVby7WUsn4hlwgIlggxABEnr4a77/zLyxX9sjCPefmQAs3+hJWO3FUySwlC8OuY2xpZW50RGF0YUpTT07HiRJ7InR5cGUiOiJ3ZWJhdXRobi5jcmVhdGUiLCJjaGFsbGVuZ2UiOiJrZFhUU1IyVzVyTXlVQ2ZZZ3lGRU5lY3FwSmtOVERPN3JvTzdJYU82N1BZIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfaR0eXBlqnB1YmxpYy1rZXmlZW1haWyzMjAwNGdhYmJvQGdtYWlsLmNvbQ=='));
        // console.log(credential);
        // -- estraggo la chiave pubblica
        const authData = cborJs.decode(credential.response.attestationObject.buffer).authData;
        const public_key = authData.slice(65, 130);
        // -- estraggo la challenge
        const clientData = JSON.parse(new TextDecoder().decode(credential.response.clientDataJSON))
        const challenge = Bytes.base64.decode(clientData.challenge, true);
        // -- esporto i dati essenziali
        const essentials = {
            id: credential.id,
            email,
            public_key: public_key,
            challenge: challenge,
        }
        // --- completo la registrazione
        const res = await API.fetch('/auth/passkey/register', {
            method: 'POST',
            body: { data: Bytes.base64.encode(msgpack.encode(essentials)) }
        });
        // ---
        console.log(res);
        if (!res) return false;
        return true;
    }
}

window.PasskeyService = PasskeyService;

document.addEventListener('DOMContentLoaded', async () => {
    if (confirm('passkey?')) await PasskeyService.request_new_passkey('2004gabbo@gmail.com')
})