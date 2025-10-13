import { asyncHandler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { UserService } from "../services/user.service.js";
import { RedisDB } from "../config/redisdb.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { Mailer } from "../config/mail.js";
import emailContents from "../docs/utils/automated.mails.js";
import { verifyPasskey } from "./passkey.middleware.js";
import { cookieUtils } from "../utils/cookie.utils.js";
import { JWT } from "../utils/jwt.utils.js";
import { Config } from "../server_config.js";
import { PoP } from "../protocols/PoP.node.js";
import { Validator } from "../utils/validator.js";

/**
 * Verifica l'access token
 * @param {{}} options
 * @param {boolean} [options.ignoreExpiration=false] - se true ignora la scadenza del token
 * @param {boolean} [options.ignoreChain=false] - se true ignora la verifica della chain
 * @param {boolean} [options.advanced=false] - se true richiede che la sessione sia avanzata
 * @returns {Function} next
 */
export const verifyAuth = (options = {}) => {
    const { ignoreExpiration = false, advanced = false, ignoreChain = false } = options;
    return asyncHandler(async (req, res, next) => {
        const jwt = cookieUtils.getCookie(req, "jwt");
        if (!jwt) {
            throw new CError("Forbidden", "Accesso negato", 401);
        }
        // -- VERIFICA
        const payload = await JWT.verify(jwt, Config.JWT_SIGN_KEY, {
            ignoreExpiration,
        });
        if (!payload) {
            throw new CError("Forbidden", "Accesso negato", 401);
        }
        // -- VERIFICO ADVANCED
        if (advanced && (!payload.advanced || payload.advanced !== true)) {
            throw new CError(
                "Forbidden",
                "Sessione avanzata non attivata",
                403
            );
        }
        // -- VERIFICO LA CHAIN
        if (!ignoreChain) {
            await verifyChain(req, res, payload.jti);
        }
        // -- memorizzo il payload nella request
        req.payload = payload;
        next();
    });
};

/**
 * Verifica la Chain e ne genera una nuova
 * @param {Request} req - richiesta per impostare il nuovo cookie
 * @param {Response} res - risposta per impostare il nuovo cookie
 * @param {string} jti - jti dell'access token
 * @returns {boolean} true se la chain è valida, false altrimenti
 */
export const verifyChain = async (req, res, jti) => {
    const chain = cookieUtils.getCookie(req, "chain");
    const counter = req.headers["x-counter"];
    Validator.of(counter).number().min(0).max(9999);
    if (!counter)
        throw new CError(
            "Forbidden",
            "Accesso negato, counter non allegato",
            401
        );
    // -- se la chain non è presente o non è valida
    if (!chain)
        throw new CError(
            "Forbidden",
            "Accesso negato, chain non allegata",
            401
        );
    // -- verifico la chain
    const newChain = await new PoP().verifyChain(chain, jti, Number(counter));
    if (!newChain)
        throw new CError("Forbidden", "Accesso negato, chain non valida", 401);
    // -- imposto il nuovo cookie
    cookieUtils.setCookie(req, res, "chain", newChain, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
    });
};

/**
 * Verifica la password di un utente
 */
export const verifyPassword = asyncHandler(async (req, res, next) => {
    const from_token = req.payload ? true : false;
    // -- ottengo un identificatore per l'utente
    if (!from_token && !req.body.email)
        throw new CError(
            "ValidationError",
            "Any information to identify user",
            422
        );
    // -- ottengo le variabili
    const password = req.body.password;
    const uid = from_token ? req.payload.uid : req.body.email;
    // -- istanzio il servizio utente e recupero il segreto
    const service = new UserService();
    const user = from_token
        ? await service.find_by_id(uid)
        : await service.find_by_email(uid);
    // -- verifico se l'utente ha attivato l'autenticazione a 2 fattori
    if (!user) throw new CError("ValidationError", "Utente non trovato", 404);
    const valid = await service.verifyPassword(password, user.password);
    if (!valid) throw new CError("AuthError", "Password non valida", 403);
    next();
});
/**
 * Verifica il codice inviato per mail
 */
export const verifyEmailCode = asyncHandler(async (req, res, next) => {
    const { request_id, code } = req.body;
    const record = await RedisDB.get(request_id);
    // -- se il codice è scaduto
    if (record === null) {
        throw new CError("TimeoutError", "Request expired", 404);
    }
    // -- recupero i dati
    const { hash: salted_hash, tryes, email } = record;
    // -- verifico il numero di tentativi
    if (tryes >= 3) {
        const ip_address = req.headers["x-forwarded-for"] || req.ip;
        // -- invio una mail per avvisare l'utente del tentativo fallito e del possibile attacco
        const { text, html } = await emailContents.otpFailedAttempt({
            email,
            ip_address,
        });
        Mailer.send(email, "OTP Failed Attemp", text, html);
        await RedisDB.delete(request_id);
        throw new CError("", "Maximum attempts achieved", 429);
    }
    // -- se il codice non è valido
    if (salted_hash === false) {
        throw new Error();
    }
    // -- verifica il codice
    const cripto = new Cripto();
    const valid = await cripto.verifyHashWithSalt(code, salted_hash);
    if (!valid) {
        // -- aumento il numero di tentativi
        await RedisDB.update(request_id, {
            hash: salted_hash,
            tryes: tryes + 1,
            email: email,
        });
        // --
        throw new CError("AuthError", "Invalid code", 403);
    }
    // memorizzo l'utente che ha fatto la richiesta
    req.payload = { ...req.payload, email };
    // -- elimino la richiesta dal db
    // await RedisDB.delete(request_id); // commentato per abilitare utilizzo multiplo del codice nella sua finestra temporale
    // -- se il codice è valido, passo al prossimo middleware
    next();
});

const authStrategies = {
    psk: verifyPasskey(),
    otp: verifyEmailCode,
    psw: verifyPassword,
};

/**
 * Middleware per selezionare in automatico l'autenticatore da usare
 * @param {Array} allowedMethods - array dei metodi permessi -> psk (passkey), otp, psw (password)
 * @returns {Function}
 */
export const authSelector = (allowedMethods = []) => {
    return (req, res, next) => {
        const method = req.headers["x-authentication-method"];

        if (!method || !allowedMethods.includes(method)) {
            return res.status(400).json({ error: "Auth method not allowed" });
        }

        const middleware = authStrategies[method];
        if (!middleware) {
            return res.status(400).json({ error: "Not valid auth method" });
        }

        return middleware(req, res, next);
    };
};
