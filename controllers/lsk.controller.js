import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { JWT } from "../utils/jwt.utils.js";
import { Bytes } from "../utils/bytes.js";
import { LSKService } from "../services/lsk.service.js";

export class LSKController {
    constructor() {
        this.service = new LSKService();
    }
    /**
     * Genera una nuova chiave cke restituendo anche quella vecchia
     * @param {Request} req
     * @param {Response} res
     */
    generate = async_handler(async (req, res) => {
        const old_cke = req.cookies.cke;
        const new_cke = Cripto.random_bytes(32, 'hex');
        // ---
        res.cookie('cke', new_cke, {
            httpOnly: true,
            secure: JWT.secure_option,
            maxAge: JWT.cke_cookie_lifetime,
            sameSite: 'Strict',
            path: '/auth',
        });
        // ---
        res.status(201).json({ old_cke, new_cke });
    });
    /**
     * Restituisce la cke corrente
     * @param {Request} req
     * @param {Response} res
     */
    get = async_handler(async (req, res) => {
        const cke_hex = req.cookies.cke;
        // --- id dell'utente
        if (!cke_hex) throw new CError("NotFoundError", "CKE non trovata", 404);
        // ---
        const key = await this.service.lsk(cke_hex, req.user.uid);
        // ---
        res.status(200).json({ key: Bytes.base64.encode(key) });
    });
}