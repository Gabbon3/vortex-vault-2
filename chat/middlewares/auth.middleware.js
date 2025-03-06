import { JWT } from "../../utils/jwt.utils.js";

/**
 * Middleware per la verifica del jwt access token
 * @param {string} access_token
 * @returns {bool | object} il payload
 */
export const verify_access_token = (access_token) => {
    // -- verifico che esista
    if (!access_token) {
        return false;
    }
    // -- verifico che l'access token sia valido
    const payload = JWT.verifica_access_token(access_token);
    if (!payload) {
        return false;
    }
    // -- passo al prossimo middleware o controller
    return payload;
}