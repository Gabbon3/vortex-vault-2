import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { RefreshTokenService } from "../services/refreshTokenService.js";
import { TokenUtils } from "../utils/tokenUtils.js";

export class RefreshTokenController {
    constructor() {
        this.service = new RefreshTokenService();
    }
    /**
     * Genera un nuovo access token se il refresh token è valido
     * @param {Request} req 
     * @param {Response} res 
     */
    generate_access_token = async_handler(async (req, res) => {
        const token_id = req.cookies.refresh_token;
        if (!token_id) throw new CError("AuthenticationError", "Refresh token non valido", 403);
        // ---
        const user_agent = req.get('user-agent');
        // ---
        const refresh_token = await this.service.verify(token_id, user_agent);
        if (!refresh_token) throw new CError("AuthenticationError", "Refresh token non valido", 403);
        // ---
        const access_token = await TokenUtils.genera_access_token(refresh_token.user_id);
        // -- ottengo l'ip adress del richiedente
        const ip_address = req.headers['x-forwarded-for'] || req.ip;
        // -- aggiorno l'ultimo utilizzo del refresh token
        await this.service.update_token_info(token_id, {
            last_used_at: new Date(),
            ip_address: ip_address ?? ''
        });
        res.status(201).json({ access_token });
    })
    /**
     * Restituisce tutti i token associati ad un utente
     * @param {*} req 
     * @param {*} res 
     */
    get_all = async_handler(async (req, res) => {
        const tokens = await this.service.get_all(req.user.uid);
        res.status(200).json( tokens );
    })
    /**
     * Revoca o riattiva un refresh token
     * @param {*} req body { token_id, revoke }
     * @param {*} res 
     */
    revoke = async_handler(async (req, res) => {
        const { token_id, revoke } = req.body;
        await this.service.revoke(token_id, revoke);
        res.status(200).json({ "revoked": revoke });
    })
    /**
     * Revoca tutti i refresh token associati ad un utente
     * @param {*} req 
     * @param {*} res 
     */
    revoke_all = async_handler(async (req, res) => {
        await this.service.revoke_all(req.user.uid);
        res.sendStatus(200);
    })
}