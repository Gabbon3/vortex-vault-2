import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";

export class LSEController {
    constructor() {
        this.rt_service = new RefreshTokenService();
        // Banalmente quando scade il cookie, l'utente sarà obbligato a usare la password
        // in questo modo la lsk varierà ogni 30 giorni
        this.cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 giorni
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
            maxAge: this.cookieMaxAge,
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