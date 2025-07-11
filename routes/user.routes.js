import express from "express";
import rateLimit from "express-rate-limit";
import { UserController } from "../controllers/user.controller.js";
import { verifyEmailCode, verifyPassword, verifyAuth, verifyShivPrivilegedToken } from "../middlewares/authMiddleware.js";
import { verifyPasskey } from "../middlewares/passkey.middleware.js";
import { emailRateLimiter } from "../middlewares/rateLimiter.middlewares.js";
import { dpopAuthMiddleware } from "../middlewares/dpop.middlewares.js";
// -- router
const router = express.Router();
// -- controller
const controller = new UserController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- AUTH ROUTES (USER)
router.post('/signup', controller.signup);
router.post('/signin', emailRateLimiter, verifyPassword, controller.signin);
router.post('/password', verifyAuth({ replayProtection: true }), verifyShivPrivilegedToken, controller.changePassword);
// -- SEARCH
router.get('/search/:email', dpopAuthMiddleware, controller.search);
// -- QUICK SIGN IN
router.post('/quick-sign-in', dpopAuthMiddleware, verifyShivPrivilegedToken, controller.quick_signin);
router.get('/quick-sign-in/:id', controller.get_quick_signin);
// -- EMAIL CODES
router.post('/email-verification', controller.sendEmailCode);
router.post('/email-verification-test', verifyEmailCode, controller.test_email_auth);
// -- ACCOUNT VERIFY
router.post('/verify-account', verifyEmailCode, controller.verify_account);
// -- SIGN-OUT
router.post('/signout', verifyAuth({ checkIntegrity: false }), controller.signout);
router.post('/clear-cookies', controller.clearCookies);
// -- DELETE
router.post('/delete', verifyPasskey(true), controller.delete);
// -- MESSAGE AUTHENTICATION CODE VERIFICATION
router.post('/vmac', controller.verify_message_authentication_code);
// -- (DEV) restituisce un message autentication code
router.get('/vmac/:email', controller.createMessageAuthenticationCode);
// API DI TEST
// test per vedere se l'access token va
router.post('/test', dpopAuthMiddleware, (req, res, next) => {
    res.status(200).json({ message: "Lesgo" });
});

export default router;