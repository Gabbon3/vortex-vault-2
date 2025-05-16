import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import { UserService } from "../services/user.service.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { JWT } from "../utils/jwt.utils.js";
import { MFAService } from "../services/mfa.service.js";
import { RamDB } from "../config/ramdb.js";
import { Mailer } from "../config/mail.js";
import { Validator } from "../public/utils/validator.js";
import { v7 as uuidv7 } from "uuid";
import automated_emails from "../public/utils/automated.mails.js";
import { Config } from "../server_config.js";
import { ShivService } from "../services/shiv.service.js";
import { SHIV } from "../protocols/SHIV.node.js";

export class UserController {
    constructor() {
        this.service = new UserService();
        this.shivService = new ShivService();
    }
    /**
     * Registra utente
     * @param {Request} req
     * @param {Response} res
     */
    signup = async_handler(async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new CError(
                "ValidationError",
                "Email and password are required",
                422
            );
        }
        // ---
        const user = await this.service.signup(email, password);
        res.status(201).json({ message: "User registered", id: user.id });
    });
    /**
     * Accede
     * @param {Request} req
     * @param {Response} res
     */
    signin = async_handler(async (req, res) => {
        const { email, publicKey: publicKeyHex } = req.body;
        // -- verifico se l'utente è già autenticato
        if (req.cookies.jwt) {
            // -- se si elimino dal db
            const kid = this.shivService.shiv.getKidFromJWT(req.cookies.jwt);
            if (kid) await this.shivService.delete({ kid }, true);
        }
        /**
         * Servizio
         */
        const { uid, salt, jwt, publicKey: serverPublicKey, bypass_token } =
            await this.service.signin({
                request: req,
                email,
                publicKeyHex
            });
        // ---
        res.cookie("jwt", jwt, {
            httpOnly: true,
            secure: true,
            maxAge: SHIV.jwtLifetime * 1000,
            sameSite: "Strict",
            path: "/",
        });
        res.cookie("uid", uid, {
            httpOnly: true,
            secure: true,
            maxAge: SHIV.jwtLifetime * 1000,
            sameSite: "Strict",
            path: "/",
        });
        // Rate Limiter Email - rimuovo dal ramdb il controllo sui tentativi per accedere all'account
        RamDB.delete(`login-attempts-${email}`);
        // ---
        res.status(201).json({
            jwt,
            publicKey: serverPublicKey,
            uid,
            salt,
            bypass_token,
        });
    });
    /**
     * Effettua la disconnessione eliminando i cookie e il refresh token
     */
    signout = async_handler(async (req, res) => {
        // -- elimino dal db
        this.service.signout(req.user.kid);
        // ---
        res.clearCookie('jwt');
        res.clearCookie('uid');
        res.clearCookie('cke');
        // ---
        res.status(201).json({ message: 'Bye' });
    });
    /**
     * Rimuove tutti i cookie del client
     */
    clearCookies = async_handler(async (req, res) => {
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // ---
        res.status(200).json({ message: "All cookies cleared" });
    });
    /**
     * Elimina un account
     */
    delete = async_handler(async (req, res) => {
        const deletedCount = await this.service.delete_by_id(req.user.uid);
        if (deletedCount === 0) throw new Error("Nessun utente eliminato");
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // -- invio una mail
        // const { text, html } = automated_emails.deleteAccount({
        //     email,
        // });
        // Mailer.send(email, "Account Deletion Confirmation", text, html);
        // ---
        res.status(200).json({ message: "All data deleted successfully" });
    });
    /**
     * Elimina tutti i cookie
     * @param {Request} req
     * @param {Response} res
     */
    deleteAllCookies = (req, res) => {
        // ---
        Object.keys(req.cookies).forEach((cookie_name) => {
            res.clearCookie(cookie_name);
        });
    };
    /**
     * Restituisce una lista di utenti
     * cercati in like tramite l'email
     */
    search = async_handler(async (req, res) => {
        const { email } = req.params;
        // -- ottengo la lista degli utenti
        const users = await this.service.search(email);
        // -- restituisco la lista
        res.status(200).json(users);
    });
    /**
     * Abilita l'autenticazione a 2 fattori
     * @param {Request} req
     * @param {Response} res
     */
    enable_mfa = async_handler(async (req, res) => {
        const { email } = req.body;
        // -- ottengo lo uid
        const { id } = await this.service.find_by_email(email);
        if (!id) throw new CError("UserNotFound", "User not found", 422);
        // --
        const { final, secret } = MFAService.generate(id);
        // -- salvo nel db
        const [affected] = await this.service.update_user_info(
            { email },
            { mfa_secret: Buffer.from(final) }
        );
        // ---
        if (affected !== 1)
            throw new CError("Internal error", "Not able to enable MFA", 500);
        // ---
        res.status(201).json({ secret: Bytes.hex.encode(secret) });
    });
    /**
     * Release sudo access token
     * @param {Request} req
     * @param {Response} res
     */
    start_sudo_session = async_handler(async (req, res) => {
        const access_token = await this.service.generate_sudo_access_token(
            req.user.uid
        );
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
        if (!email || !Validator.email(email))
            throw new CError("ValidationError", "No email provided", 422);
        const code = Cripto.random_mfa_code();
        const request_id = `ear-${email}`; // ear = email auth request
        // -- controllo che non sia gia stata fatta una richiesta
        if (RamDB.get(request_id))
            throw new CError(
                "RequestError",
                "There's another active request, check or try again later",
                400
            );
        // -- salvo nel ramdb
        const salted_hash = Cripto.salting(code);
        // memorizzo il codice hashato con salt con hmac
        const db_data = [
            salted_hash,
            0, // tentativi
            email,
        ];
        const is_set = RamDB.set(request_id, db_data, 120);
        if (!is_set) throw new Error("Not able to generate verification code");
        // ---
        const { text, html } = automated_emails.otpCode({ email, code });
        const is_send = await Mailer.send(
            email,
            "Vortex Verification Code",
            text,
            html,
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
        const id = uuidv7();
        const is_set =
            RamDB.set("fsi" + id, credentials, 150) && // fsi = fast sign-in
            RamDB.set("passKey" + id, true, 150); // passKey = per saltare il controllo del refresh token
        if (!is_set) throw new Error("RamDB error");
        // ---
        res.status(201).json({ id });
    });
    /**
     * Restituisce le credenziali cifrate di un utente che ha richiesto l'accesso rapido
     */
    get_quick_signin = async_handler(async (req, res) => {
        const { id } = req.params;
        const credentials = RamDB.get("fsi" + id);
        if (!credentials)
            throw new CError("NotFoundError", "Credentials not found", 404);
        RamDB.delete("fsi" + id);
        // ---
        res.status(200).json({ credentials });
    });
    /**
     * Verifica un email
     */
    verify_account = async_handler(async (req, res) => {
        const { email } = req.user;
        if (!email) throw new CError("", "Email not found", 404);
        // ---
        const [affected] = await this.service.update_user_info(
            { email },
            { verified: true }
        );
        if (affected > 1) throw new Error("Updated multiple emails");
        // ---
        res.status(200).json({ message: "Account verified" });
    });
    /**
     * Just a test
     */
    test_email_auth = async_handler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
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
        const { old_password, new_password, email } = req.body;
        // ---
        if (!old_password || !new_password || !email)
            throw new CError(
                "",
                "Missing data needed to make password change",
                422
            );
        // ---
        const [affected] = await this.service.change_password(
            req.user.uid,
            old_password,
            new_password
        );
        if (affected !== 1)
            throw new CError("ServerError", "Not able to change password", 500);
        // -- invio una mail
        const { text, html } = automated_emails.changePassword({
            email,
        });
        Mailer.send(email, "Password Change Confirmation", text, html);
        // ---
        res.status(200).json({ message: "Password changed!" });
    });
    /**
     * Imposta le informazioni di recupero password
     * @param {Request} req
     * @param {Response} res
     */
    set_recovery = async_handler(async (req, res) => {
        const recovery = req.body;
        // -- salvo sul db
        const [affected] = await this.service.update_user_info(
            { id: req.user.uid },
            { recovery }
        );
        if (affected !== 1)
            throw new CError(
                "ServerError",
                "Not able to set recovery informations",
                500
            );
        // ---
        res.status(200).json({
            message: "Recovery access enabled successfully",
        });
    });
    /**
     * Restituisce le informazioni di recupero password
     * @param {Request} req
     * @param {Response} res
     */
    get_recovery = async_handler(async (req, res) => {
        const { email } = req.user;
        // ---
        const user = await this.service.find_by_email(email);
        if (!user)
            throw new CError(
                "ValidationError",
                "Email provided does not exist",
                404
            );
        res.status(200).json({ recovery: user.recovery });
    });
    /**
     * Verifica la validità di un message authentication code
     */
    verify_message_authentication_code = async_handler(async (req, res) => {
        const { email, mac } = req.body; // mac = message_authentication_code
        // -- verifico che ci siano i dati
        if (!email)
            throw new CError("", "No email passed for verification", 422);
        // ---
        const status = Mailer.verify_message_authentication_code(email, mac);
        res.status(200).json(status);
    });
    /**
     * (DEV) genera e restituisce un message authentication code
     */
    createMessageAuthenticationCode = async_handler(async (req, res) => {
        if (!Config.DEV) throw new CError('', 'Access denied.', 403);
        // ---
        const { email } = req.params;
        if (!email) throw new CError('', 'Access denied.', 400);
        // ---
        const mac = Mailer.message_authentication_code(email);
        res.status(200).json({ token: mac });
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
            res.cookie("access_token", cookies.access_token, {
                httpOnly: true,
                secure: true,
                maxAge: JWT.access_token_cookie_lifetime,
                sameSite: "Strict",
                path: "/", // disponibile per tutte le route
            });
        }
        if (cookies.refresh_token) {
            res.cookie("refresh_token", cookies.refresh_token, {
                httpOnly: true,
                secure: true,
                maxAge: JWT.refresh_token_cookie_lifetime,
                sameSite: "Strict",
                path: "/auth",
            });
        }
    };
}
