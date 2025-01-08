import { async_handler } from "../helpers/asyncHandler.js";
import { RamDB } from "../config/ramdb.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import msgpack from "../public/utils/msgpack.min.js";
import { Passkey } from "../models/passkey.model.js";
import { fido2 } from "../services/passkey.service.js";
import { JWT } from "../utils/jwt.utils.js";
import "dotenv/config";

export const verify_passkey = async_handler(async (req, res, next) => {
    /**
     * VERIFICA JWT PER BYPASS SUL CONTROLLO DELLA PASSKEY
     */
    // -- controllo se il token JWT relativo alla passkey esiste
    const cookie_jwt = req.cookies.passkey_token ?? null;
    if (cookie_jwt) {
        const payload = JWT.verify(cookie_jwt, 'passkey');
        // -- se è valido bypasso il controllo sulla passkey
        if (payload) {
            req.user = { uid: payload.uid };
            return next();
        }
    }
    /**
     * CONTROLLO SULLA PASSKEY
     */
    // -- ottengo dal body i dati necessari
    const { request_id, auth_data } = req.body;
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
                origin: process.env.ORIGIN,
                factor: "either",
                publicKey: passkey.public_key,
                prevCounter: passkey.sign_count,
                userHandle: credential.userHandle
            }
        );
        // -- aumento faccio corrispondere il sign count sul db
        passkey.sign_count = assertionResult.authnrData.get("counter");
        await passkey.save();
    } catch (error) {
        console.warn(error);
        throw new CError("", "Authentication failed", 401);
    }
    // -- se sono stati superati i controlli, genero un jwt
    const jwt = JWT.sign({ uid: passkey.user_id }, JWT.passkey_token_lifetime, 'passkey');
    // - imposto il cookie
    res.cookie('passkey_token', jwt, {
        httpOnly: true,
        secure: true,
        maxAge: JWT.passkey_token_lifetime * 1000,
        sameSite: 'Strict',
        path: '/',
    });
    // ---
    RamDB.delete(`chl-${request_id}`);
    // ---
    req.user = { uid: passkey.user_id };
    next();
});
