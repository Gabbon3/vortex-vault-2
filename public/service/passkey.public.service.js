import { Bytes } from "../../utils/bytes.js";
import { API } from "../utils/api.js";
import msgpack from "../utils/msgpack.min.js";

export class PasskeyService {
    static async request_new_passkey(email) {
        const req = await API.fetch(`/auth/passkey/register/${email}`, {
            method: 'GET',
        });
        if (!req) return false;
        // ---
        const options = msgpack.decode(Bytes.base64.decode(req.options));
        // -- genero le credenziali
        const credential = await navigator.credentials.create({ publicKey: options });
        // -- preparo i dati da inviare al server
        const publicKeyCredential = {
            id: credential.id,
            rawId: new Uint8Array(credential.rawId),
            response: {
                attestationObject: new Uint8Array(credential.response.attestationObject),
                clientDataJSON: new Uint8Array(credential.response.clientDataJSON),
            },
            type: credential.type,
        };
        // --- invio al server
        const res = await API.fetch('/auth/passkey/register', {
            method: 'POST',
            body: { 
                publicKeyCredential: Bytes.base64.encode(msgpack.encode(publicKeyCredential)), 
                email
            }
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