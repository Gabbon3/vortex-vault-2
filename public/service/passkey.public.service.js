import { Bytes } from "../../utils/bytes.js";
import { API } from "../utils/api.js";
import msgpack from "../utils/msgpack.min.js";

export class PasskeyService {
    /**
     * Registra una nuova passkey
     * @param {string} email 
     * @returns {boolean}
     */
    static async activate_new_passkey(email, request_id = null, code = null) {
        const req = await API.fetch(`/auth/passkey/register-${request_id ? 'e' : 'a'}`, {
            method: "POST",
            body: { email, request_id, code }
        });
        if (!req) return false;
        // ---
        const options = msgpack.decode(Bytes.base64.decode(req.options));
        // -- genero le credenziali
        let credential = null;
        try {
            credential = await navigator.credentials.create({
                publicKey: options,
            });
        } catch (error) {
            console.log('Aborted');
            return null;
        }
        // -- preparo i dati da inviare al server
        const publicKeyCredential = {
            id: credential.id,
            rawId: new Uint8Array(credential.rawId),
            response: {
                attestationObject: new Uint8Array(
                    credential.response.attestationObject
                ),
                clientDataJSON: new Uint8Array(
                    credential.response.clientDataJSON
                ),
            },
            type: credential.type,
        };
        // --- invio al server
        const res = await API.fetch("/auth/passkey/register", {
            method: "POST",
            body: {
                publicKeyCredential: Bytes.base64.encode(
                    msgpack.encode(publicKeyCredential)
                ),
                email,
            },
        });
        // ---
        console.log(res);
        if (!res) return false;
        return true;
    }
    /**
     * Effettua in maniera dinamica un'autenticazione tramite passkey indicando l'endpoint necessario
     * @param {string} endpoint qualsiasi endpoint del server
     * @param {string} method POST, GET...
     * @returns {boolean}
     */
    static async authenticate(endpoint, method = 'POST') {
        const chl_req_id = await API.fetch(`/auth/passkey/`, {
            method: "GET",
        });
        if (!chl_req_id) return false;
        // ---
        const { request_id, challenge: challenge_base64 } = chl_req_id;
        // -- decodifico la challenge
        const challenge = Bytes.base64.decode(challenge_base64);
        // -- creo l'oggetto per la richiesta di autenticazione
        const publicKeyCredentialRequestOptions = {
            challenge,
            userVerification: "preferred",
        };
        // -- seleziono la passkey e firmo
        let credential = null;
        try {
            credential = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions,
            });
        } catch (error) {
            console.log('Passkey auth request Aborted');
            return null;
        } 
        // -- invio la challenge firmata al client
        const auth_data = {
            id: credential.id,
            rawId: new Uint8Array(credential.rawId),
            response: {
                authenticatorData: new Uint8Array(credential.response.authenticatorData),
                clientDataJSON: new Uint8Array(credential.response.clientDataJSON),
                signature: new Uint8Array(credential.response.signature),
            },
            userHandle: credential.response.clientDataJSON.userHandle,
        };
        // -- invio all'endpoint scelto la risposta
        const authorizated = await API.fetch(endpoint, {
            method,
            body: {
                request_id, // per identificare la richiesta
                auth_data: Bytes.base64.encode(
                    msgpack.encode(auth_data)
                ),
            },
        });
        // --
        if (!authorizated) return false;
        return true;
    }
    /**
     * Restituisce la lista delle passkeys dell'utente
     */
    static async list() {
        const res = await API.fetch('/auth/passkey/list', {
            method: 'GET',
        });
        if (!res) return null;
        return res;
    }
    /**
     * Rinomina
     */
    static async rename(id, name) {
        const res = await API.fetch(`/auth/passkey/rename/${id}`, {
            method: 'POST',
            body: { name },
        });
        if (!res) return false;
        return true;
    }
    /**
     * Elimina una passkey
     * @param {BigInt} id 
     */
    static async delete(id) {
        const res = await API.fetch(`/auth/passkey/${id}`, {
            method: 'DELETE',
        });
        if (!res) return false;
        return true;
    }
}

window.PasskeyService = PasskeyService;