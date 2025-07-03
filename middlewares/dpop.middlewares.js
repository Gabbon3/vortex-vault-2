import { DPoP } from "../protocols/DPoP.server.js";
import { Config } from "../server_config.js";

/**
 * Middleware di verifica DPoP
 * Questo middleware verifica:
 * 1. La presenza e validità del token DPoP (proof token)
 * 2. La presenza e validità del token di accesso associato
 * 3. Che la chiave pubblica nel proof token corrisponda al thumbprint usato nel token di accesso (binding)
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
export const dpopAuthMiddleware = async (req, res, next) => {
    try {
        // 1. Estrai proof token DPoP dall'header 'authorization' con schema 'DPoP '
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('DPoP ')) {
            return res.status(401).json({ success: false, error: 'DPoP proof token missing or malformed' });
        }
        const dpopProofToken = authHeader.substring(5);

        const dpop = new DPoP({
            privateKey: Config.DPOP_PRIVATE_KEY
        });

        // 2. Verifica proof token DPoP
        const proofResult = await dpop.verify(
            dpopProofToken,
            req.method,
            `${req.protocol}://${req.get('host')}${req.originalUrl}`
        );

        if (!proofResult.isValid) {
            return res.status(401).json({ success: false, error: proofResult.error });
        }

        // 3. Estrai token di sessione JWT dal cookie 'jwt'
        const jwtToken = req.cookies?.jwt;
        if (!jwtToken) {
            return res.status(401).json({ success: false, error: 'Session JWT cookie missing' });
        }

        // 4. Verifica JWT di sessione con binding (cnf.jkt) che deve corrispondere alla thumbprint del proof token
        const accessTokenValid = await dpop.verifyAccessToken(jwtToken, proofResult.thumbprint);
        if (!accessTokenValid) {
            return res.status(401).json({ success: false, error: 'Session JWT is invalid or does not bind to the DPoP proof key' });
        }

        // 5. Tutte le verifiche sono andate a buon fine, inserisco dati utili nella richiesta
        req.state.dpop = {
            jwk: proofResult.jwk,
            payload: proofResult.payload,
            thumbprint: proofResult.thumbprint,
            sessionJwt: jwtToken
        };

        next();

    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            error: error.message
        });
    }
};
