import { asyncHandler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { RedisDB } from "../config/redisdb.js";
import { Config } from "../server_config.js";

/**
 * Rate Limiter per l'email
 * 5 tentativi ogni 15 minuti
 */
export const emailRateLimiter = asyncHandler(async (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    if (!email) throw new CError('', 'Email is required', 400);
    // ---
    const key = `login-attempts-${email}`;
    const attempts = await RedisDB.get(key) || 0;
    // ---
    if (attempts >= Config.TRLEMAIL) throw new CError('', 'Too many requests', 429);
    // -- aggiorno i tentativi
    await RedisDB.set(key, attempts + 1, 15 * 60);
    // ---
    next();
});