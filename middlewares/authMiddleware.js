import { asyncHandler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { UserService } from "../services/user.service.js";
import { JWT } from "../utils/jwt.utils.js";
import { Roles } from "../utils/roles.js";
import { RedisDB } from "../config/redisdb.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { Mailer } from "../config/mail.js";
import emailContents from "../docs/utils/automated.mails.js";
import { SHIV } from "../protocols/SHIV.node.js";
import { verifyPasskey } from "./passkey.middleware.js";
import { cookieUtils } from "../utils/cookie.utils.js";

/**
 * Middleware di autenticazione e autorizzazione basato su JWT e controllo d'integrità opzionale.
 * => req.payload = payload { uid, role, kid }
 * @function verifyAccessToken
 * @param {Object} [options={}] - Opzioni per configurare il middleware.
 * @param {number} [options.requiredRole=Roles.BASE] - Ruolo minimo richiesto per accedere alla rotta.
 * @param {boolean} [options.checkIntegrity=true] - Se true, abilita la verifica dell'integrità tramite header 'X-Integrity'.
 * @returns {Function} Express middleware async che valida l'access token e opzionalmente verifica l'integrità.
 */
export const verifyAuth = (options = {}) => {
    const { requiredRole = Roles.BASE, checkIntegrity = true } = options;
    return async (req, res, next) => {
        const jwt = (cookieUtils.getCookie(req, 'jwt')) || req.headers.authorization?.split(" ")[1];
        // -- verifico che esista
        if (!jwt) return res.status(401).json({ error: "JWT not found" });
        // ---
        const shiv = new SHIV();
        // -- ottengo il kid
        const kid = shiv.getKidFromJWT(jwt);
        // ---
        const jwtSignKey = await shiv.getSignKey(kid, 'jwt-signing');
        if (!jwtSignKey)
            return res.status(401).json({ error: "JWT Key not found" });
        // -- verifico che l'access token sia valido
        const payload = JWT.verify(jwt, jwtSignKey);
        if (!payload) return res.status(401).json({ error: "Invalid JWT sign" });
        // -- se è tutto ok aggiungo il payload dell'utente alla request
        req.payload = payload;
        // -- verifica se il payload è conforme
        if (!req.payload.uid)
            return res.status(400).json({ error: "Sign-in again" });
        // -- verifica del ruolo
        if (req.payload.role < requiredRole)
            return res.status(403).json({ error: "Insufficient privileges" });
        /**
         * Verifico l'integrità della richiesta
         */
        if (checkIntegrity) {
            const integrity = req.get("X-Integrity");
            if (!integrity)
                return res.status(403).json({ error: "Integrity not found" });
            // -- verifico l'integrity
            const { kid } = payload;
            const verified = await shiv.verifyIntegrity(kid, req.body ?? {}, req.method, `${req.baseUrl}${req.path}`, integrity);
            // ---
            if (verified === -1)
                return res.status(404).json({ error: "Secret not found" });
            if (!verified)
                return res.status(403).json({ error: "Integrity failed" });
        }
        // -- passo al prossimo middleware o controller
        next();
    };
};

/**
 * Verifica un shiv privileged token
 * configura la proprietà req.ppt = payload del ppt
 */
export const verifyShivPrivilegedToken = asyncHandler(
    async (req, res, next) => {
        if (!req.payload) throw new Error("Payload mancante, è necessario richiamare prima verifyAuth");
        // ---
        const ppt = cookieUtils.getCookie(req, 'ppt');
        if (!ppt)
            return res.status(401).json({ error: "Access denied" });
        // ---
        const shiv = new SHIV();
        // -- ottengo il kid
        let kid = req.payload.kid;
        // ---
        const pptSignKey = await shiv.getSignKey(kid, 'ppt-signing');
        if (!pptSignKey)
            return res.status(401).json({ error: "Access denied" });
        // -- verifico che il ppt sia valido
        const payload = JWT.verify(ppt, pptSignKey);
        if (!payload) return res.status(401).json({ error: "Access denied" });
        // -- passo le informazioni
        req.ppt = payload;
        // -- passo al prossimo middleware o controller
        next();
    }
);

/**
 * Verifica la password di un utente
 */
export const verifyPassword = asyncHandler(async (req, res, next) => {
    const from_token = req.payload ? true : false;
    // -- ottengo un identificatore per l'utente
    if (!from_token && !req.body.email) throw new CError('ValidationError', 'Any information to identify user', 422);
    // -- ottengo le variabili
    const password = req.body.password;
    const uid = from_token ? req.payload.uid : req.body.email;
    // -- istanzio il servizio utente e recupero il segreto
    const service = new UserService();
    const user = from_token ? await service.find_by_id(uid) : await service.find_by_email(uid);
    // -- verifico se l'utente ha attivato l'autenticazione a 2 fattori
    if (!user) throw new CError("ValidationError", "User not found", 404);
    const valid = await service.verify_password(password, user.password);
    if (!valid) throw new CError("AuthError", "Invalid password", 403);
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
        const ip_address = req.headers['x-forwarded-for'] || req.ip;
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
    req.payload = { email };
    // -- elimino la richiesta dal db
    // await RedisDB.delete(request_id); // commentato per abilitare utilizzo multiplo del codice nella sua finestra temporale
    // -- se il codice è valido, passo al prossimo middleware
    next();
});

const authStrategies = {
    'psk': verifyPasskey(),
    'otp': verifyEmailCode,
    'psw': verifyPassword,
}

/**
 * Middleware per selezionare in automatico l'autenticatore da usare
 * @param {Array} allowedMethods - array dei metodi permessi -> psk (passkey), otp, psw (password)
 * @returns {Function}
 */
export const authSelector = (allowedMethods = []) => {
    return (req, res, next) => {
        const method = req.headers['x-authentication-method'];

        if (!method || !allowedMethods.includes(method)) {
            return res.status(400).json({ error: 'Auth method not allowed' });
        }

        const middleware = authStrategies[method];
        if (!middleware) {
            return res.status(400).json({ error: 'Not valid auth method' });
        }

        return middleware(req, res, next);
    };
};