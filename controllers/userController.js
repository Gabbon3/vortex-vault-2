import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { UserService } from "../services/userService.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { TokenUtils } from "../utils/tokenUtils.js";

export class UserController {
    constructor() {
        this.service = new UserService();
    }
    /**
     * Registra utente
     * @param {Request} req 
     * @param {Response} res 
     */
    registra = async_handler(async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new CError("ValidationError", "Username e password sono richiesti", 422);
        }
        // ---
        const user = await this.service.registra(username, password);
        res.status(201).json({ message: 'Utente registrato con successo', id: user.id });
    })
    /**
     * Accede
     * @param {Request} req 
     * @param {Response} res 
     */
    accedi = async_handler(async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new CError("ValidationError", "Username e password sono richiesti", 422);
        }
        // ---
        const user_agent = req.get('user-agent');
        const ip_address = req.headers['x-forwarded-for'] || req.ip;
        // -- Access Token
        const { access_token, refresh_token, user } = await this.service.accedi(username, password, user_agent, ip_address);
        const cke = Cripto.random_bytes(32, 'base64');
        this.set_token_cookies(res, access_token, refresh_token, cke);
        // ---
        res.status(201).json({
            access_token,
            refresh_token,
            cke
        });
    })
    /**
     * Imposta nei cookie l'access e il refresh token
     * @param {Response} res 
     * @param {string} access_token 
     * @param {string} refresh_token 
     */
    set_token_cookies = (res, access_token, refresh_token, cke) => {
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: TokenUtils.secure_option, // da mettere true in produzione
            maxAge: TokenUtils.access_token_cookie_lifetime,
            sameSite: 'Strict',
            path: '/', // disponibile per tutte le route
        });
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: TokenUtils.secure_option, // da mettere true in produzione
            maxAge: TokenUtils.refresh_token_cookie_lifetime,
            sameSite: 'Strict',
            path: '/auth/token/refresh',
        });
        res.cookie('cke', cke, {
            httpOnly: true,
            secure: TokenUtils.secure_option, // da mettere true in produzione
            maxAge: TokenUtils.cke_cookie_lifetime,
            sameSite: 'Strict',
            path: '/auth', // disponibile per tutte le route
        });
    }
}

