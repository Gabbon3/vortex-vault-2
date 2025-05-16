import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";

export class CKEController {
    static cookieLifetime = 365 * 24 * 60 * 60 * 1000;
    constructor() {}
    /**
     * Rigenera del nuovo materiale cookie restituendo quello vecchio se presente
     * @param {Request} req
     * @param {Response} res
     */
    set = async_handler(async (req, res) => {
        const oldMaterial = req.cookies.cke;
        const newMaterial = Cripto.random_bytes(32, 'hex');
        // ---
        res.cookie('cke', newMaterial, {
            httpOnly: true,
            secure: true,
            maxAge: CKEController.cookieLifetime,
            sameSite: 'Strict',
            path: '/cke',
        });
        // ---
        res.status(201).json({ oldMaterial, material: newMaterial });
    });
    /**
     * Restituisce il materiale corrente in base64
     * @param {Request} req
     * @param {Response} res
     */
    get = async_handler(async (req, res) => {
        const material = req.cookies.cke;
        // --- id dell'utente
        if (!material) throw new CError("NotFoundError", "Material not found", 404);
        // ---
        res.status(200).json({ material });
    });
}