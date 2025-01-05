import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import msgpack from "../public/utils/msgpack.min.js";
import { PasskeyService } from "../services/passkey.service.js";
import { Bytes } from "../utils/bytes.js";

export class PasskeyController {
    constructor() {
        this.service = new PasskeyService();
    }
    /**
     * Gestisce la richiesta per ottenere le opzioni di registrazione (fase 1 del flusso WebAuthn).
     */
    start_registration = async_handler(async (req, res) => {
        const { email } = req.params;
        // ---
        const options = await this.service.start_registration(email);
        // ---
        res.status(200).json(options);
    });
    /**
     * Gestisce la risposta della registrazione inviata dal client (fase 2 del flusso WebAuthn).
     */
    complete_registration = async_handler(async (req, res) => {
        
        // --
        const result = await this.service.complete_registration();
        // ---
        res.status(201).json({ success: result.verified });
    });
    /**
     * Genera delle opzioni di accesso (la challenge)
     */
    get_auth_options = async_handler(async (req, res) => {
        const options = await this.service.generate_auth_options();
        // ---
        res.status(201).json({ options });
    });
}
