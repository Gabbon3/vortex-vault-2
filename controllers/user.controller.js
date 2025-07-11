import { asyncHandler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.js";
import { UserService } from "../services/user.service.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { MFAService } from "../services/mfa.service.js";
import { RedisDB } from "../config/redisdb.js";
import { Mailer } from "../config/mail.js";
import { Validator } from "../docs/utils/validator.js";
import { v7 as uuidv7 } from "uuid";
import emailContents from "../docs/utils/automated.mails.js";
import { Config } from "../server_config.js";
import { ShivService } from "../services/shiv.service.js";
import { SHIV } from "../protocols/SHIV.node.js";
import { cookieUtils } from "../utils/cookie.utils.js";
import msgpack from "../docs/utils/msgpack.min.js";
import { DPoP } from "../protocols/DPoP.server.js";

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
    signup = asyncHandler(async (req, res) => {
        const { email, password, dek: encodedDek, salt } = req.body;
        if (!email || !password || !encodedDek) {
            throw new CError(
                "ValidationError",
                "Email and password are required",
                422
            );
        }
        // -- decodifico
        const dek = Buffer.from(encodedDek, 'base64');
        // ---
        const user = await this.service.signup(email, password, dek, salt);
        res.status(201).json({ message: "User registered", id: user.id });
    });
    /**
     * Accede
     * @param {Request} req
     * @param {Response} res
     */
    signin = asyncHandler(async (req, res) => {
        const { email, jwkPublicKey } = req.body;
        /**
         * Servizio
         */
        const { uid, salt, dek, jwt, bypassToken } =
            await this.service.signin({
                request: req,
                email,
                jwkPublicKey
            });
        // ---
        cookieUtils.setCookie(req, res, 'jwt', jwt, {
            httpOnly: true,
            secure: true,
            maxAge: DPoP.jwtLifetime * 1000,
            sameSite: "Lax",
            path: "/",
        });
        cookieUtils.setCookie(req, res, 'uid', uid, {
            httpOnly: true,
            secure: true,
            maxAge: DPoP.jwtLifetime * 1000,
            sameSite: "Lax",
            path: "/",
        })
        // Rate Limiter Email - rimuovo dal ramdb il controllo sui tentativi per accedere all'account
        await RedisDB.delete(`login-attempts-${email}`);
        // ---
        res.status(201).json({
            jwt,
            uid,
            salt,
            dek: dek.toString('base64'),
            bypassToken,
        });
    });
    /**
     * Effettua la disconnessione eliminando i cookie e il refresh token
     */
    signout = asyncHandler(async (req, res) => {
        // -- elimino dal db
        this.service.signout(req.payload.kid);
        // ---
        cookieUtils.deleteCookie(req, res, 'jwt');
        cookieUtils.deleteCookie(req, res, 'uid');
        cookieUtils.deleteCookie(req, res, 'cke');
        // ---
        res.status(201).json({ message: 'Bye' });
    });
    /**
     * Rimuove tutti i cookie del client
     */
    clearCookies = asyncHandler(async (req, res) => {
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // ---
        res.status(200).json({ message: "All cookies cleared" });
    });
    /**
     * Elimina un account
     */
    delete = asyncHandler(async (req, res) => {
        const deletedCount = await this.service.delete_by_id(req.payload.sub);
        if (deletedCount === 0) throw new Error("Nessun utente eliminato");
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // -- invio una mail
        // const { text, html } = await emailContents.deleteAccount({
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
    search = asyncHandler(async (req, res) => {
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
    enable_mfa = asyncHandler(async (req, res) => {
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
     * Invia una mail con il codice di verifica
     * @param {Request} req
     * @param {Response} res
     */
    sendEmailCode = asyncHandler(async (req, res) => {
        const email = req.body.email;
        if (!email || !Validator.email(email))
            throw new CError("ValidationError", "No email provided", 422);
        const cripto = new Cripto();
        const code = cripto.randomMfaCode();
        const request_id = `ear-${email}`; // ear = email auth request
        // -- controllo che non sia gia stata fatta una richiesta
        if (await RedisDB.get(request_id))
            throw new CError(
                "RequestError",
                "There's another active request, check or try again later",
                400
            );
        // -- salvo nel ramdb
        const salted_hash = await cripto.hashWithSalt(code);
        // memorizzo il codice hashato con salt con hmac
        const db_data = {
            hash: salted_hash,
            tryes: 0,
            email: email,
        };
        const is_set = await RedisDB.set(request_id, db_data, 120);
        if (!is_set) throw new Error("Not able to generate verification code");
        // ---
        const { text, html } = await emailContents.otpCode({ email, code });
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
    quick_signin = asyncHandler(async (req, res) => {
        const { credentials } = req.body;
        // ---
        const id = uuidv7();
        const is_set =
            await RedisDB.set("fsi" + id, credentials, 150) && // fsi = fast sign-in
            await RedisDB.set("passKey" + id, true, 150); // passKey = per saltare il controllo del refresh token
        if (!is_set) throw new Error("RedisDB error");
        // ---
        res.status(201).json({ id });
    });
    /**
     * Restituisce le credenziali cifrate di un utente che ha richiesto l'accesso rapido
     */
    get_quick_signin = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const credentials = await RedisDB.get("fsi" + id);
        if (!credentials)
            throw new CError("NotFoundError", "Credentials not found", 404);
        await RedisDB.delete("fsi" + id);
        // ---
        res.status(200).json({ credentials });
    });
    /**
     * Verifica un email
     */
    verify_account = asyncHandler(async (req, res) => {
        const { email } = req.payload;
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
    test_email_auth = asyncHandler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
    });
    /**
     * Just a test
     * @param {Request} req
     * @param {Response} res
     */
    test_2fa = asyncHandler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
    });
    /**
     *
     * @param {Request} req
     * @param {Response} res
     */
    changePassword = asyncHandler(async (req, res) => {
        const { newPassword, email, dek: encodedDek } = req.body;
        // ---
        if (!newPassword || !email || !encodedDek)
            throw new CError(
                "",
                "Missing data needed to make password change",
                422
            );
        // ---
        const DEK = Buffer.from(encodedDek, 'base64');
        // ---
        const changed = await this.service.changePassword(
            req.payload.sub,
            newPassword,
            DEK,
        );
        if (!changed)
            throw new CError("ServerError", "Not able to change password", 500);
        // -- invio una mail
        const { text, html } = await emailContents.changePassword({
            email,
        });
        Mailer.send(email, "Password Change Confirmation", text, html);
        // ---
        res.status(200).json({ message: "Password changed!" });
    });
    /**
     * Verifica la validità di un message authentication code
     */
    verify_message_authentication_code = asyncHandler(async (req, res) => {
        const { email, mac } = req.body; // mac = message_authentication_code
        // -- verifico che ci siano i dati
        if (!email)
            throw new CError("", "No email passed for verification", 422);
        // ---
        const status = await Mailer.verify_message_authentication_code(email, mac);
        res.status(200).json(status);
    });
    /**
     * (DEV) genera e restituisce un message authentication code
     */
    createMessageAuthenticationCode = asyncHandler(async (req, res) => {
        if (!Config.DEV) throw new CError('', 'Access denied.', 403);
        // ---
        const { email } = req.params;
        if (!email) throw new CError('', 'Access denied.', 400);
        // ---
        const mac = await Mailer.message_authentication_code(email);
        res.status(200).json({ token: mac });
    });
}
