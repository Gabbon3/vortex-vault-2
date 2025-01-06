import express from "express";
import rateLimit from "express-rate-limit";
import { RefreshTokenController } from "../controllers/refreshToken.controller.js";
import { verify_access_token, verify_email_code } from "../middlewares/authMiddleware.js";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new RefreshTokenController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- le routes con i controller associati
// /auth/token
router.post('/refresh', controller.generate_access_token);
router.post('/rename', verify_access_token(), controller.rename);
router.post('/revoke', verify_access_token(1), controller.revoke);
// -- device recovery
router.post('/unlock', verify_passkey, controller.unlock);
router.post('/unlockwithemail', verify_email_code, controller.unlock);
router.post('/revoke-all', verify_access_token(1), controller.revoke_all);
router.get('/', verify_access_token(), controller.get_all);
router.post('/delete', verify_access_token(1), controller.delete)

export default router;