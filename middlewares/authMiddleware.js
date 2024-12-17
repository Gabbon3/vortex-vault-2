import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { UserService } from "../services/user.service.js";
import { TokenUtils } from "../utils/tokenUtils.js";
import { TOTP } from "../utils/totp.js";
import { MFAService } from "../services/mfa.service.js";
import { Roles } from "../utils/roles.js";
import { RamDB } from "../config/ramdb.js";
/**
 * Middleware per la verifica del jwt e refresh 
 * dell'access token se scaduto
 * @param {number} required_role di default quello base
 */
export const verify_access_token = (required_role = Roles.BASE) => (req, res, next) => {
    const access_token = req.cookies.access_token;
    // -- verifico che esista
    if (!access_token) {
        return res.status(401).json({ error: "Access denied" });
    }
    // -- verifico che l'access token sia valido
    const payload = TokenUtils.verifica_access_token(access_token);
    if (!payload) {
        return res.status(401).json({ error: "Access denied" });
    }
    // -- se è tutto ok aggiungo il payload dell'utente alla request
    req.user = payload;
    // -- verifica del ruolo
    if (req.user.role < required_role) {
        return res.status(403).json({ error: "Insufficient privileges" });
    }
    // -- passo al prossimo middleware o controller
    next();
}
/**
 * Verifica la password di un utente
 */
export const verify_password = async_handler( async (req, res, next) => {
    const from_token = req.user ? true : false;
    // -- ottengo un identificatore per l'utente
    if (!from_token && !req.body.email) throw new CError('ValidationError', 'Any information to identify user', 429);
    // -- ottengo le variabili
    const password = req.body.password;
    const uid = from_token ? req.user.uid : req.body.email;
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
export const verify_email_code = async_handler(async (req, res, next) => {
    const { request_id, code } = req.body;
    const db_code = RamDB.get(request_id);
    if (db_code === null) throw new CError("TimeoutError", "Request expired", 404);
    if (db_code === false) throw new Error();
    // ---
    const valid = code === db_code;
    if (!valid) throw new CError("AuthError", "Invalid code", 403);
    // -- elimino la richiesta dal db
    RamDB.delete(request_id);
    next();
});
/**
 * verifica il codice mfa
 */
export const verify_mfa_code = async_handler(async (req, res, next) => {
    const from_token = req.user ? true : false;
    // -- ottengo un identificatore per l'utente
    if (!from_token && !req.body.email) throw new CError('ValidationError', 'Any information to identify user', 429);
    // -- ottengo le variabili
    const code = req.body.code;
    const uid = from_token ? req.user.uid : req.body.email;
    // -- istanzio il servizio utente e recupero il segreto
    const service = new UserService();
    const user = from_token ? await service.find_by_id(uid) : await service.find_by_email(uid);
    // -- verifico se l'utente ha attivato l'autenticazione a 2 fattori
    if (!user) throw new CError("ValidationError", "User not found", 404);
    if (!user.mfa_secret) throw new CError("ValidationError", "Any secret to use", 404);
    const secret = MFAService.decrypt(user.mfa_secret);
    // -- verifico il codice
    const valid = await TOTP.verify(code, secret);
    if (!valid) throw new CError("AuthError", "Invalid code", 403);
    next();
});