import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import { RefreshToken } from "../models/refreshToken.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { RamDB } from "../config/ramdb.js";

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
        const public_key = Buffer.from(Bytes.base64.decode(public_key_base64));
        // ---
        const token_id = req.cookies.refresh_token;
        if (!token_id) throw new CError("", "Refresh token not found", 404);
        // ---
        const hash_current_token = this.rt_service.get_token_digest(token_id);
        // ---
        const refresh_token = await RefreshToken.findOne({ 
            where: { 
                user_id: req.user.uid,
                token_hash: hash_current_token
            }
        });
        if (!refresh_token) throw new CError("", "Refresh token not found", 404);
        // ---
        refresh_token.public_key = public_key;
        const updated = await refresh_token.save();
        // -- salvo nel ramdb per fare la cache
        RamDB.set(`${req.user.uid}${refresh_token}`, new Uint8Array(public_key), 60 * 60 * 24);
        // ---
        if (!updated) throw new CError("", "Error while saving public key", 500);
        res.status(200).json({ message: "Public key saved" });
    });
    /**
     * Restituisce la chiave pubblica associata al dispositivo
     * @param {Request} req
     * @param {Response} res
     */
    get = async_handler(async (req, res) => {
        const refresh_token = req.cookies.refresh_token;
        if (!refresh_token) throw new CError("", "Refresh token not found", 404);
        // -- provo a recuperare dalla cache
        let key = RamDB.get(`${req.user.uid}${refresh_token}`);
        // se non è in cache la recupero dal db e la metto in cache
        if (!key) {
            key = await this.rt_service.get_public_key({ user_id: req.user.uid, token_hash: refresh_token });
            RamDB.set(`${req.user.uid}${refresh_token}`, new Uint8Array(key), 60 * 60 * 24);
        }
        // ---
        res.status(200).json({ public_key: Bytes.base64.encode(key) });
    });
    /**
     * Elimina i cookie
     * @param {Request} req 
     * @param {Response} res 
     */
    async deleteAllCookies(req, res) {
        Object.keys(req.cookies).forEach((cookie_name) => {
            res.clearCookie(cookie_name, { path: '/' });
        });
    }
}