import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { RamDB } from "../config/ramdb.js";
import { Bytes } from "../utils/bytes.js";
import msgpack from "../public/utils/msgpack.min.js";
import { Passkey } from "../models/passkey.model.js";
import { fido2 } from "../services/passkey.service.js";
import { JWT } from "../utils/jwt.utils.js";
import { Config } from "../server_config.js";

/**
 * Funzione che verifica la passkey, con la possibilità di rendere la verifica obbligatoria.
 * Restituisce una funzione middleware asincrona per Express incapsulata con async_handler.
 * 
 * @param {boolean} required true per richiedere la verifica della passkey, false per bypassare con il token JWT
 * @returns {function} Middleware asincrono con gestione degli errori tramite async_handler
 */
export const verify_passkey = (required = false) => {
    return async_handler(async (req, res, next) => {
        /**
         * Verifico se ce un bypass token
         */
        const { bypass_token } = req.body;
        if (bypass_token) {
            const payload = RamDB.get(`byp-${bypass_token}`);
            if (payload) {
                req.user = { uid: payload.uid };
                return next();
            }
        }

        const { request_id, auth_data } = req.body;

        /**
         * CONTROLLO SULLA PASSKEY
         */
        if (!request_id || !auth_data) throw new CError("", "Invalid request", 422);

        // -- decodifico gli auth data
        const credential = msgpack.decode(Bytes.base64.decode(auth_data));

        // -- recupero la challenge dal ramdb
        const challenge = RamDB.get(`chl-${request_id}`);
        if (!challenge) throw new CError("", "Auth request expired", 400);

        // -- recupero la passkey
        const passkey = await Passkey.findOne({
            where: { credential_id: credential.id },
        });
        if (!passkey) throw new CError("", "Passkey not found", 404);

        // -- verifico la challenge
        try {
            const assertionResult = await fido2.assertionResult(
                {
                    id: credential.id,
                    rawId: credential.rawId.buffer,
                    response: {
                        authenticatorData: credential.response.authenticatorData.buffer,
                        clientDataJSON: credential.response.clientDataJSON.buffer,
                        signature: credential.response.signature.buffer,
                    },
                },
                {
                    challenge,
                    origin: Config.ORIGIN,
                    factor: "either",
                    publicKey: passkey.public_key,
                    prevCounter: passkey.sign_count,
                    userHandle: credential.userHandle
                }
            );
            // -- aggiorno sign_count e salvo la passkey
            passkey.sign_count = assertionResult.authnrData.get("counter");
            passkey.updated_at = new Date();
            await passkey.save({
                silent: true
            });
        } catch (error) {
            console.warn(error);
            throw new CError("", "Authentication failed", 401);
        }

        // -- rimuovo la challenge dal DB
        RamDB.delete(`chl-${request_id}`);

        // -- imposto l'utente nel request
        req.user = { uid: passkey.user_id };
        next();
    });
};