import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { LSKService } from "../services/lsk.service.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { Bytes } from "../utils/bytes.js";
import { Roles } from "../utils/roles.js";
import { JWT } from "../utils/jwt.utils.js";
import { User } from "../models/user.js";
import { RefreshToken } from "../models/refreshToken.js";

export class RefreshTokenController {
    constructor() {
        this.service = new RefreshTokenService();
        this.cke_service = new LSKService();
    }
    /**
     * Genera un nuovo access token se il refresh token è valido
     * @param {Request} req 
     * @param {Response} res 
     */
    generate_access_token = async_handler(async (req, res) => {
        const token_id = req.cookies.refresh_token;
        if (!token_id) throw new CError("AuthenticationError", "Invalid refresh token", 403);
        // ---
        const user_agent = req.get('user-agent');
        // ---
        const refresh_token = await this.service.verify(req.user.uid, token_id, user_agent);
        if (!refresh_token) throw new CError("AuthenticationError", "Invalid refresh token", 403);
        // ---
        const access_token = await JWT.genera_access_token({ uid: req.user.uid, role: Roles.BASE });
        // -- ottengo l'ip adress del richiedente
        const ip_address = req.headers['x-forwarded-for'] || req.ip;
        // -- aggiorno l'ultimo utilizzo del refresh token
        await this.service.update_token_info(token_id, {
            last_used_at: new Date().toISOString(),
            ip_address: ip_address ?? ''
        });
        // -- imposto il cookie
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: JWT.secure_option, // da mettere true in produzione
            maxAge: JWT.access_token_cookie_lifetime,
            sameSite: 'Strict',
            path: '/', // disponibile per tutte le route
        });
        // ---
        res.status(201).json({ access_token, public_key: Bytes.base64.encode(refresh_token.public_key) });
    })
    /**
     * Restituisce tutti i token associati ad un utente
     * @param {*} req 
     * @param {*} res 
     */
    get_all = async_handler(async (req, res) => {
        const tokens = await this.service.get_all(req.user.uid, req.cookies.refresh_token);
        res.status(200).json( tokens );
    })
    /**
     * Revoca o riattiva un refresh token
     * @param {*} req body { token_id, revoke }
     * @param {*} res 
     */
    revoke = async_handler(async (req, res) => {
        const { token_id, revoke } = req.body;
        const current_token = req.cookies.refresh_token;
        if (token_id === current_token) throw new CError('SelfRevocationError', "Self-revocation of the current device's token is not allowed.", 403);
        // ---
        await this.service.revoke(token_id, revoke);
        res.status(200).json({ "revoked": revoke });
    });
    /**
     * Riattiva un refresh token revocato tramite controllo mfa
     * @param {*} req body { token_id }
     * @param {*} res 
     */
    unlock = async_handler(async (req, res) => {
        const current_token = req.cookies.refresh_token;
        if (!current_token) throw new Error('ValidationError', 'Any token avaiable', 404);
        // ---
        let uid = req.user?.uid ?? null;
        if (!uid) {
            const { email } = req.user;
            const user = await User.findOne({
                where: { email },
                attributes: ['id'],
            });
            uid = user.id;
        }
        const [affectedCount] = await this.service.update_token_info(uid, current_token, {
            is_revoked: false
        });
        // ---
        if (affectedCount === 0) throw new CError("", "The email entered is not associated with this device", 403);
        let message = 'Device unlocked';
        // if (affectedCount === 0) message = 'The device was already unlocked';
        res.status(200).json({ message });
    });
    /**
     * Revoca tutti i refresh token associati ad un utente
     * @param {*} req 
     * @param {*} res 
     */
    revoke_all = async_handler(async (req, res) => {
        await this.service.revoke_all(req.user.uid);
        res.sendStatus(200);
    });
    /**
     * Rinomina un token
     */
    rename = async_handler(async (req, res) => {
        const { token_id, device_name } = req.body;
        await this.service.update_token_info(req.user.uid, token_id, { device_name });
        res.status(200).json({ "renamed": true });
    });
    /**
     * Elimina un refresh token
     * @param {*} req 
     * @param {*} res 
     */
    delete = async_handler(async (req, res) => {
        const { token_id } = req.body;
        await this.service.delete(token_id, req.user.uid);
        res.status(200).json({ "deleted": true });
    });
}