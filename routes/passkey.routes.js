import express from "express";
import { PasskeyController } from "../controllers/passkey.controller.js";
import { verifyAuth, verifyShivPrivilegedToken, verifyEmailCode } from "../middlewares/authMiddleware.js";
import { verifyPasskey } from "../middlewares/passkey.middleware.js";
import rateLimit from "express-rate-limit";
import { dpopAuthMiddleware } from "../middlewares/dpop.middlewares.js";
// -- router
const router = express.Router();
// -- controller
const controller = new PasskeyController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100, // massimo 10 richieste per 2 minuti
    message: "Too many requests, try later",
});
router.use(limiter);
// -- auth/passkey
// -- START REGISTRATION
router.post('/register-e', verifyEmailCode, controller.start_registration);
router.post('/register-a', dpopAuthMiddleware, controller.start_registration);
// -- COMPLETE REGISTRATION
router.post('/register', controller.complete_registration);
router.get('/', controller.get_auth_options);
// -- PASSKEY-LIST
router.get('/list', dpopAuthMiddleware, controller.list);
// -- RENAME
router.post('/rename/:id', dpopAuthMiddleware, controller.rename);
// -- DELETE
router.delete('/:id', dpopAuthMiddleware, verifyShivPrivilegedToken, controller.delete);
router.post('/test', verifyPasskey(true), (req, res) => {
    res.status(200).json({ message: "Hi user " + req.payload.uid });
});

export default router;