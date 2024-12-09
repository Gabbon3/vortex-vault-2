import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../public/utils/bytes.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { UserService } from "../services/user.service.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { TokenUtils } from "../utils/tokenUtils.js";
import { MFAService } from "../services/mfa.service.js";

export class UserController {
    constructor() {
        this.service = new UserService();
        this.refresh_token_service = new RefreshTokenService();
    }
    /**
     * Registra utente
     * @param {Request} req 
     * @param {Response} res 
     */
    signup = async_handler(async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new CError("ValidationError", "Username and password are required", 422);
        }
        // ---
        const user = await this.service.signup(username, password);
        res.status(201).json({ message: 'User registered', id: user.id });
    })
    /**
     * Accede
     * @param {Request} req 
     * @param {Response} res 
     */
    signin = async_handler(async (req, res) => {
        const { username, password } = req.body;
        const refresh_token_cookie = req.cookies.refresh_token;
        if (!username || !password) {
            throw new CError("ValidationError", "Username and password are required", 422);
        }
        // ---
        const user_agent = req.get('user-agent');
        const ip_address = req.headers['x-forwarded-for'] || req.ip;
        // -- refresh token 
        let old_refresh_token = null;
        if (refresh_token_cookie) {
            // -- verifico se è valido
            if (await this.refresh_token_service.verify(refresh_token_cookie, user_agent)) {
                old_refresh_token = refresh_token_cookie
            }
        }
        // -- Access Token
        const { access_token, refresh_token, user } = await this.service.signin(username, password, user_agent, ip_address, old_refresh_token);
        const cke = Cripto.random_bytes(32, 'base64');
        this.set_token_cookies(res, access_token, refresh_token, cke);
        // ---
        if (!access_token) {
            return res.status(403).json({
                error: "This device is locked",
                refresh_token
            });
        }
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
    enable_mfa = async_handler(async (req, res) => {
        const { final, secret } = MFAService.generate();
        // -- salvo nel db
        const [affected] = await this.service.update_user_info(req.user.uid, { mfa_secret: Buffer.from(final) });
        // ---
        if (affected !== 1) throw new CError("Internal error", "Not able to enable MFA", 500);
        // ---
        res.status(201).json({ secret: Bytes.hex.to(secret) });
    });
    /**
     * Just a test
     * @param {Request} req 
     * @param {Response} res 
     */
    test_2fa = async_handler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
    });
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    change_password = async_handler(async (req, res) => {
        const { old_password, new_password } = req.body;
        // ---
        const [ affected ] = await this.service.change_password(req.user.uid, old_password, new_password);
        if (affected !== 1) throw new CError("ServerError", "Not able to change password", 500);
        res.status(200).json({ message: "Password changed!", cke: req.cookies.cke });
    });
    /**
     * Imposta le informazioni di recupero password
     * @param {Request} req 
     * @param {Response} res 
     */
    set_recovery = async_handler(async (req, res) => {
        const recovery = req.body;
        // -- salvo sul db
        const [ affected ] = await this.service.update_user_info(req.user.uid, { recovery });
        if (affected !== 1) throw new CError("ServerError", "Not able to set recovery informations", 500);
        // ---
        res.status(200).json({ message: 'Recovery access enabled successfully' });
    });
    /**
     * Restituisce le informazioni di recupero password
     * @param {Request} req 
     * @param {Response} res 
     */
    get_recovery = async_handler(async (req, res) => {
        const { username } = req.params;
        // ---
        const user = await this.service.find_by_username(username);
        if (!user) throw new CError("ValidationError", "Username provided does not exist", 404);
        res.status(200).json({ recovery: user.recovery });
    });
    /**
     * Imposta nei cookie l'access e il refresh token
     * @param {Response} res 
     * @param {string} access_token 
     * @param {string} refresh_token 
     */
    set_token_cookies = (res, access_token, refresh_token, cke) => {
        if (access_token) {
            res.cookie('access_token', access_token, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.access_token_cookie_lifetime,
                sameSite: 'Strict',
                path: '/', // disponibile per tutte le route
            });
        }
        if (refresh_token) {
            res.cookie('refresh_token', refresh_token, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.refresh_token_cookie_lifetime,
                sameSite: 'Strict',
                path: '/auth',
            });
        }
        if (cke) {
            res.cookie('cke', cke, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.cke_cookie_lifetime,
                sameSite: 'Strict',
                path: '/auth', // disponibile per tutte le route
            });
        }
    }
}

