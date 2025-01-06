import { async_handler } from "../helpers/asyncHandler.js";
import { RamDB } from "../config/ramdb.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import msgpack from "../public/utils/msgpack.min.js";
import { Passkey } from "../models/passkey.model.js";
import { fido2 } from "../services/passkey.service.js";
import "dotenv/config";

export const verify_passkey = async_handler(async (req, res, next) => {
    // ---
    // const rpId = process.env.RPID;
    const origin = process.env.ORIGIN;
    // ---
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
                origin,
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
    // ---
    RamDB.delete(`chl-${request_id}`);
    // ---
    req.user = { uid: passkey.user_id };
    next();
});
