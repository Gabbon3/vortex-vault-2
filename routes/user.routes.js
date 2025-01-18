import express from "express";
import rateLimit from "express-rate-limit";
import { UserController } from "../controllers/user.controller.js";
import { verify_access_token, verify_email_code, verify_mfa_code } from "../middlewares/authMiddleware.js";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new UserController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 150,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- AUTH ROUTES (USER)
router.post('/registrati', controller.signup);
router.post('/signin', controller.signin);
router.post('/password', verify_access_token(), controller.change_password);
// -- QUICK SIGN IN
router.post('/quick-sign-in', verify_access_token(1), controller.quick_signin);
router.get('/quick-sign-in/:id', controller.get_quick_signin);
// -- EMAIL CODES
router.post('/email-verification', controller.send_email_verification);
router.post('/email-verification-test', verify_email_code, controller.test_email_auth);
// -- ACCOUNT VERIFY
router.post('/verify-account', verify_email_code, controller.verify_account);
// -- PASSWORD RECOVERY
router.post('/recovery/:email', verify_email_code, controller.get_recovery);
router.post('/new-recovery', verify_access_token(1), express.raw({ type: 'application/octet-stream' }), controller.set_recovery);
// -- MFA (DEPRECATED)
router.post('/mfa', verify_email_code, controller.enable_mfa);
router.post('/mfa_test', verify_access_token(), verify_mfa_code, controller.test_2fa);
// -- GET SUDO TOKEN
router.post('/sudotoken', verify_passkey, controller.start_sudo_session);
// -- SIGN-OUT
router.post('/signout', verify_access_token(), controller.signout);
// -- DELETE
router.post('/delete', verify_passkey, controller.delete);
// -- MESSAGE AUTHENTICATION CODE VERIFICATION
router.post('/vmac', controller.verify_message_authentication_code);

export default router;