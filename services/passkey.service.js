import { CError } from "../helpers/cError.js";
import { ECDSA } from "../utils/ecdsa.js";
import { Passkey } from "../models/passkey.model.js";
import { User } from "../models/user.js";
import { Mailer } from "../config/mail.js";
import "dotenv/config";
import automated_emails from "../public/utils/automated.mails.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { RamDB } from "../config/ramdb.js";
import { Bytes } from "../utils/bytes.js";
import cbor from 'cbor';

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
        if (RamDB.has(`psk-chl-${email}`))
            throw new CError(
                "",
                "A registration request already exists for this account",
                400
            );
        // ---
        const user = await User.findOne({
            where: { email },
        });
        if (!user) throw new CError("UserNotFound", "User not found", 422);
        // -- genero la challenge
        const challenge = Cripto.random_bytes(32, "base64");
        // -- salvo nel RamDB
        RamDB.set(`psk-chl-${email}`, { challenge, user_id: user.id }, 60);
        // ---
        return {
            challenge: challenge,
            rp: { id: PasskeyService.rpId, name: PasskeyService.rpName },
            user: {
                id: user.id,
                name: user.email,
                displayName: user.email.split('@')[0],
            },
            pubKeyCredParams: [
                { type: "public-key", alg: -7 }, // ECDSA
                { type: "public-key", alg: -257 }, // RSA
            ],
        };
    }
    /**
     * Completa la registrazione di una passkey
     * @param {string} id 
     * @param {Uint8Array} public_key 
     * @param {Uint8Array} signature 
     * @param {string} email 
     * @returns {boolean}
     */
    async complete_registration(id, public_key, signature, email) {
        const entry = RamDB.get(`psk-chl-${email}`);
        if (!entry) throw new CError("", "Request expired", 400);
        // ---
        const challenge = entry.challenge;
        const is_valid = ECDSA.verify(challenge, signature, public_key);
        if (!is_valid) throw new CError("", "Invalid signature", 401);
        // ---
        await Passkey.create({
            credential_id: credential_id,
            public_key: Buffer.from(public_key),
            user_id: entry.user_id,
        });
        // -- invio la mail
        const { text, html } = automated_emails.newPasskeyAdded(email);
        Mailer.send(email, "New Passkey", text, html);
        // ---
        return true;
    }
    /**
     * Genera le opzioni di autenticazione per il login dell'utente.
     *
     * @returns {object} - Le opzioni di autenticazione da inviare al client.
     */
    async generate_auth_options() {
        return this.webauthn.authenticationOptions();
    }
    /**
     * Verifica la risposta dell'autenticazione inviata dal client.
     *
     * @param {object} response - La risposta del client contenente i dati dell'autenticazione.
     * @returns {object} - I dettagli della verifica dell'autenticazione.
     * @throws {CError} - Se l'autenticazione non è verificata o se ci sono errori nei dati.
     */
    async verify_auth_response(response) {
        const passkey = await Passkey.findOne({
            where: { credentialId: response.id },
        });
        if (!passkey)
            throw new CError(
                "CredentialsNotFound",
                "Credentials not found",
                404
            );
        // ---
        const verification = await this.webauthn.verifyAuthenticationResponse({
            response,
            expectedChallenge: response.challenge,
            expectedRPID: Passkey.rpId,
            expectedOrigin: Passkey.origin,
            credentialPublicKey: passkey.public_key,
            credentialCurrentSignCount: passkey.sign_count,
        });
        if (!verification.verified) throw new CError("", "Access denied", 403);
        // ---
        passkey.sign_count = verification.authenticationInfo.newSignCount;
        await passkey.save();
        // ---
        return verification;
    }
}
