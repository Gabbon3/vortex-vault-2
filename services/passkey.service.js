import { CError } from "../helpers/cError.js";
import { Passkey } from "../models/passkey.model.js";
import { User } from "../models/user.js";
import { Mailer } from "../config/mail.js";
import "dotenv/config";
import automated_emails from "../public/utils/automated.mails.js";
import { RamDB } from "../config/ramdb.js";
import { Fido2Lib } from "fido2-lib";
import { Bytes } from "../utils/bytes.js";
import { UID } from "../utils/uid.js";

export const fido2 = new Fido2Lib({
    timeout: 60000,
    rpId: process.env.RPID,
    rpName: "Vortex Vault",
    challengeSize: 32,
    attestation: 'direct'
});

export class PasskeyService {
    static rpName = "Vortex Vault";
    static rpId = process.env.RPID;
    static origin = process.env.ORIGIN;
    // ---
    constructor() {}
    /**
     * Genera le opzioni di registrazione per un utente.
     *
     * @param {string} email - email dell'utente che sta cercando di registrarsi.
     * @returns {object} - Le opzioni di registrazione da inviare al client.
     * @throws {CError} - Se l'utente non viene trovato.
     */
    async start_registration(email) {
        const user = await User.findOne({
            where: { email },
        });
        if (!user) throw new CError("UserNotFound", "User not found", 422);
        // -- l'account dell'utente deve essere verificato affinche possa essere attivata una nuova passkey
        if (!user.verified) throw new CError("", "You're not able to register any passkey to this account.", 403);
        // -- genero la challenge e le options
        const options = await fido2.assertionOptions();
        options.user = {
            id: Bytes.uuid.decode(user.id),
            name: user.email,
            displayName: user.email.split('@')[0],
        };
        options.challenge = new Uint8Array(options.challenge);
        options.rp = {
            name: PasskeyService.rpName,
            id: PasskeyService.rpId,
        }
        options.pubKeyCredParams = [
            { type: "public-key", alg: -7 }, // ES256: ECDSA w/ SHA-256
            { type: "public-key", alg: -257 }, // RS256: RSASSA-PKCS1-v1_5 w/ SHA-256
        ];
        // -- salvo nel RamDB
        RamDB.set(`psk-chl-${email}`, { challenge: options.challenge, user_id: user.id }, 60);
        // ---
        return options;
    }
    /**
     * Completa la registrazione di una passkey
     * @param {object} credentials
     * @returns {boolean}
     */
    async complete_registration(credentials, email) {
        const entry = RamDB.get(`psk-chl-${email}`);
        if (!entry) throw new CError("", "Request expired", 400);
        // ---
        const { challenge, user_id } = entry;
        // -- verifico la challenge
        const attestation = await fido2.attestationResult({
            id: credentials.id,
            rawId: credentials.rawId.buffer,
            response: {
                attestationObject: credentials.response.attestationObject.buffer,
                clientDataJSON: credentials.response.clientDataJSON.buffer,
            },
        }, { challenge: challenge, origin: PasskeyService.origin, factor: "either", });
        // -- estraggo i dati necessari
        const credential_id = Bytes.base64.encode(attestation.authnrData.get('credId'), true);
        const public_key = attestation.authnrData.get('credentialPublicKeyPem'); // Chiave pubblica in formato PEM
        const sign_count = attestation.authnrData.get('counter');
        const attestation_format = attestation.fmt;
        // -- salvo sul db
        await Passkey.create({
            credential_id,
            public_key,
            sign_count,
            user_id,
            attestation_format,
        });
        // -- invio la mail
        const { text, html } = automated_emails.newPasskeyAdded(email);
        Mailer.send(email, "New Passkey", text, html);
        RamDB.delete(`psk-chl-${email}`);
        // ---
        return true;
    }
    /**
     * Genera le opzioni di autenticazione per l'utente.
     * @returns {object} - Le opzioni di autenticazione da inviare al client.
     */
    async generate_auth_options() {
        const request_id = UID.generate();
        // -- creo una challenge unica
        const options = await fido2.assertionOptions();
        const challenge = new Uint8Array(options.challenge);
        // -- salvo nel RamDB
        RamDB.set(`chl-${request_id}`, challenge, 60);
        // -- invio la challenge e la request id
        return { challenge, request_id };
    }
    /**
     * Restituisce la lista di tutte le passkeys
     * @param {number} uid 
     */
    async list(uid) {
        return await Passkey.findAll({ 
            where: { user_id: uid },
            attributes: ['id', 'name', 'created_at', 'updated_at']
        });
    }
    /**
     * Aggiorna un qualunque campo della passkey
     * @param {string} id
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns {Array} [affectedCount]
     */
    async update(id, updated_info) {
        return await Passkey.update(
            updated_info,
            { where: { id } }
        );
    }
    /**
     * Elimina una passkey
     * @param {BigInt} id 
     * @param {number} uid 
     */
    async delete(id, uid) {
        return await Passkey.destroy({
            where: {
                user_id: uid,
                id: id
            }
        })
    }
}
