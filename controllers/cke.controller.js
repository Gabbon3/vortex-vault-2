import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { TokenUtils } from "../utils/tokenUtils.js";

export class CkeController {
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
            secure: TokenUtils.secure_option, // da mettere true in produzione
            maxAge: TokenUtils.cke_cookie_lifetime,
            sameSite: 'Strict',
            path: '/auth', // disponibile per tutte le route
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
        const cke = req.cookies.cke;
        if (!cke) throw new CError("NotFoundError", "CKE non trovata", 404);
        res.status(200).json({ cke });
    });
}