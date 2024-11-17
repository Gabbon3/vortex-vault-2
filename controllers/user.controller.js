import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../public/utils/bytes.js";
import { UserService } from "../services/user.service.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { TokenUtils } from "../utils/tokenUtils.js";
import { TOTP } from "../utils/totp.js";

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
            cke,
            salt: user.salt
        });
    });
    /**
     * Abilita l'autenticazione a 2 fattori
     * @param {Request} req 
     * @param {Response} res 
     */
    enable_2fa = async_handler(async (req, res) => {
        const secret = Cripto.random_bytes(20, 'hex');
        const [ affected ] = await this.service.update_user_info(req.user.uid, { totp_secret: secret });
        if (affected !== 1) throw new CError('Internal Error', 'Impossibile abilitare l\'autenticazione a due fattori', 500);
        // ---
        res.status(201).json({
            secret
        });
    });
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    test_2fa = async_handler(async (req, res) => {
        const { code } = req.body;
        if (!code) throw new CError("ValidationError", "Codice di autenticazione a due fattori non specificato", 422);
        // ---
        const user = await this.service.find_by_id(req.user.uid);
        if (!user.totp_secret) throw new CError("ValidationError", "L'autenticazione a due fattori non è abilitata per questo utente", 422);
        // --
        const secret_bytes = Bytes.hex.from(user.totp_secret);
        const valid = await TOTP.verify(code, secret_bytes);
        if (!valid) throw new CError("ValidationError", "Codice di autenticazione a due fattori non valido", 401);
        // ---
        res.status(200).json({ message: 'Codice di autenticazione a due fattori valido' });
    });
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

