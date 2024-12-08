import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../public/utils/bytes.js";
import { UserService } from "../services/user.service.js";
import { TokenUtils } from "../utils/tokenUtils.js";
import { TOTP } from "../utils/totp.js";
import { MFAService } from "../services/mfa.service.js";
/**
 * Middleware per la verifica del jwt e refresh 
 * dell'access token se scaduto
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
export const verify_access_token = (req, res, next) => {
    const access_token = req.cookies.access_token;
    // -- verifico che esista
    if (!access_token) {
        return res.status(401).json({ error: "Invalid access token" });
    }
    // -- verifico che l'access token sia valido
    const payload = TokenUtils.verifica_access_token(access_token);
    if (!payload) {
        // - provo a rigenerare l'access token
        // - se va a buon fine vuol dire che il token è valido ed è stato rigenerato correttamente
        // return TokenUtils.refresh_token(req, res);
        return res.status(401)
            .json({ error: "Invalid access token" });
    }
    // -- se è tutto ok aggiungo il payload dell'utente alla request
    req.user = payload;
    // -- passo al prossimo payload o controller
    next();
}

export const verify_mfa_code = async_handler(async (req, res, next) => {
    const from_token = req.user ? true : false;
    // -- ottengo un identificatore per l'utente
    if (!from_token && !req.body.username) throw new CError('ValidationError', 'Any information to identify user', 429);
    // -- ottengo le variabili
    const code = req.body.code;
    const uid = from_token ? req.user.uid : req.body.username;
    // -- istanzio il servizio utente e recupero il segreto
    const service = new UserService();
    const user = from_token ? await service.find_by_id(uid) : await service.find_by_username(uid);
    // -- verifico se l'utente ha attivato l'autenticazione a 2 fattori
    if (!user) throw new CError("ValidationError", "User not exist", 404);
    if (!user.mfa_secret) throw new CError("ValidationError", "Any secret to use", 404);
    const secret = MFAService.decrypt(user.mfa_secret);
    // -- verifico il codice
    const valid = await TOTP.verify(code, secret);
    if (!valid) throw new CError("AuthError", "Invalid code", 403);
    next();
});