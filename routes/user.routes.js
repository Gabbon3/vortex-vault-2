import express from "express";
import rateLimit from "express-rate-limit";
// import { verifica_jwt } from "../middlewares/authMiddleware.js";
import { UserController } from "../controllers/user.controller.js";
import { verify_access_token, verify_email_code, verify_mfa_code, verify_password } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new UserController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 250, // massimo 10 richieste per 2 minuti
    message: "Too many requests, try later",
});
router.use(limiter);
// -- le routes con i controller associati
router.post('/registrati', controller.signup);
router.post('/accedi', controller.signin);
router.post('/password', verify_access_token(), controller.change_password);
// -- invio codici verifica via mail
router.post('/email-verification', controller.send_email_verification);
router.post('/email-verification-test', verify_email_code, controller.test_email_auth);
// -- password recovery
router.get('/recovery/:email', controller.get_recovery);
router.post('/recovery', verify_access_token(1), express.raw({ type: 'application/octet-stream' }), controller.set_recovery);
// ---
router.post('/mfa', verify_access_token(), verify_email_code, controller.enable_mfa);
router.post('/mfa_test', verify_mfa_code, controller.test_2fa);
// ---
router.post('/sudotoken', verify_access_token(), verify_mfa_code, controller.start_sudo_session);

export default router;