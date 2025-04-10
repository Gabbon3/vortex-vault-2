import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";

export class LSEController {
    constructor() {
        this.rt_service = new RefreshTokenService();
    }
    /**
     * Salva una nuova chiave pubblica per il dispositivo
     */
    set = async_handler(async (req, res) => {
        const { public_key: public_key_base64 } = req.body;
        if (!public_key_base64) throw new CError("", "Public key is missing", 422);
        // -- salvo nei cookie
        res.cookie('lsk_public_key', public_key_base64, {
            httpOnly: true,
            secure: true,
            maxAge: 10 * 365 * 24 * 60 * 60, // 10 anni
            sameSite: 'Strict',
            path: '/auth/lse',
        });
        // ---
        res.status(201).json({ message: "Public key saved" });
    });
    /**
     * Restituisce la chiave pubblica associata al dispositivo
     * @param {Request} req
     * @param {Response} res
     */
    get = async_handler(async (req, res) => {
        const public_key = req.cookies.lsk_public_key;
        // ---
        if (!public_key) throw new CError('', 'Public key not found', 404);
        // ---
        res.status(200).json({ public_key });
    });
}