import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { UserService } from "../services/user.service.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { TokenUtils } from "../utils/tokenUtils.js";
import { MFAService } from "../services/mfa.service.js";
import { RamDB } from "../config/ramdb.js";
import { Mailer } from "../config/mail.js";
import { Validator } from "../public/utils/validator.js";
import { UID } from "../utils/uid.js";

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
        const { email, password } = req.body;
        if (!email || !password) {
            throw new CError("ValidationError", "Email and password are required", 422);
        }
        // ---
        const user = await this.service.signup(email, password);
        res.status(201).json({ message: 'User registered', id: user.id });
    })
    /**
     * Accede
     * @param {Request} req 
     * @param {Response} res 
     */
    signin = async_handler(async (req, res) => {
        const { email, password, passKey } = req.body;
        const refresh_token_cookie = req.cookies.refresh_token;
        if (!email || !password) {
            throw new CError("ValidationError", "Email and password are required", 422);
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
        const { access_token, refresh_token, user } = await this.service.signin(email, password, user_agent, ip_address, old_refresh_token, passKey);
        const cke = Cripto.random_bytes(32, 'base64');
        this.set_token_cookies(res, { access_token, refresh_token, cke });
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
     * Effettua la disconnessione eliminando i cookie e il refresh token
     */
    signout = async_handler(async (req, res) => {
        const refresh_token = req.cookies.refresh_token;
        // -- elimino il refresh token
        await this.refresh_token_service.delete(refresh_token, req.user.uid);
        // -- elimino i cookie
        Object.keys(req.cookies).forEach((cookie_name) => {
            res.clearCookie(cookie_name, { path: '/' });
        });
        // ---
        res.status(200).json({ message: 'Disconnected' });
    });
    /**
     * Abilita l'autenticazione a 2 fattori
     * @param {Request} req 
     * @param {Response} res 
     */
    enable_mfa = async_handler(async (req, res) => {
        const { email } = req.body;
        const { final, secret } = MFAService.generate();
        // -- salvo nel db
        const [affected] = await this.service.update_user_info({ email }, { mfa_secret: Buffer.from(final) });
        // ---
        if (affected !== 1) throw new CError("Internal error", "Not able to enable MFA", 500);
        // ---
        res.status(201).json({ secret: Bytes.hex.to(secret) });
    });
    /**
     * Release sudo access token
     * @param {Request} req 
     * @param {Response} res 
     */
    start_sudo_session = async_handler(async (req, res) => {
        const access_token = await this.service.generate_sudo_access_token(req.user.uid);
        this.set_token_cookies(res, { access_token });
        res.status(201).json({ access_token });
    });
    /**
     * Invia una mail con il codice di verifica
     * @param {Request} req
     * @param {Response} res
     */
    send_email_verification = async_handler(async (req, res) => {
        const email = req.body.email;
        if (!email || !Validator.email(email)) throw new CError("ValidationError", "Any email founded", 422);
        const code = Cripto.random_mfa_code();
        const request_id = `ear-${email}`; // ear = email auth request
        // -- controllo che non sia gia stata fatta una richiesta
        if (RamDB.get(request_id)) throw new CError("RequestError", "There's another active request, check or try again later", 400);
        // -- salvo nel ramdb
        const is_set = RamDB.set(request_id, code, 150);
        if (!is_set) throw new Error("Not able to generate verification code");
        // ---
        const is_send = await Mailer.send(
            email,
            'Vortex Verification Code',
            code
        );
        if (!is_send) throw new Error("Not able to send the email");
        res.status(201).json({ request_id });
    });
    /**
     * Memorizza temporaneamente le credenziali cifrate di un utente
     * sul ramdb per poterlo farlo accedere rapidamente da un dispositivo
     * autenticato A ad uno non autenticato B
     */
    quick_signin = async_handler(async (req, res) => {
        const { credentials } = req.body;
        // ---
        const id = UID.generate();
        const is_set = 
            RamDB.set('fsi' + id, credentials, 150) // fsi = fast sign-in 
            && RamDB.set('passKey' + id, true, 150); // passKey = per saltare il controllo del refresh token
        if (!is_set) throw new Error("RamDB error");
        // ---
        res.status(201).json({ id });
    });
    /**
     * Restituisce le credenziali cifrate di un utente che ha richiesto l'accesso rapido
     */
    get_quick_signin = async_handler(async (req, res) => {
        const { id } = req.params;
        const credentials = RamDB.get('fsi' + id);
        if (!credentials) throw new CError("NotFoundError", "Credentials not found", 404);
        RamDB.delete('fsi' + id);
        // ---
        res.status(200).json({ credentials });
    });
    /**
     * Verifica un email
     */
    verify_account = async_handler(async (req, res) => {
        const { email } = req.body;
        // ---
        const [affected] = await this.service.update_user_info({ email }, { verified: true });
        if (affected > 1) throw new Error("Updated multiple emails");
        // ---
        res.status(200).json({ message: "Account verified" });
    });
    /**
     * Just a test
     */
    test_email_auth = async_handler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
    })
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
        const [ affected ] = await this.service.update_user_info({ id: req.user.uid }, { recovery });
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
        const { email } = req.params;
        // ---
        const user = await this.service.find_by_email(email);
        if (!user) throw new CError("ValidationError", "Email provided does not exist", 404);
        res.status(200).json({ recovery: user.recovery });
    });
    /**
     * Imposta nei cookie l'access e il refresh token
     * @param {Response} res 
     * @param {Object} cookies
     * @param {*} [cookies.access_token]
     * @param {*} [cookies.refresh_token]
     * @param {*} [cookies.cke]
     */
    set_token_cookies = (res, cookies) => {
        if (cookies.access_token) {
            res.cookie('access_token', cookies.access_token, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.access_token_cookie_lifetime,
                sameSite: 'Strict',
                path: '/', // disponibile per tutte le route
            });
        }
        if (cookies.refresh_token) {
            res.cookie('refresh_token', cookies.refresh_token, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.refresh_token_cookie_lifetime,
                sameSite: 'Strict',
                path: '/auth',
            });
        }
        if (cookies.cke) {
            res.cookie('cke', cookies.cke, {
                httpOnly: true,
                secure: TokenUtils.secure_option, // da mettere true in produzione
                maxAge: TokenUtils.cke_cookie_lifetime,
                sameSite: 'Strict',
                path: '/auth', // disponibile per tutte le route
            });
        }
    }
}

