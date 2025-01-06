import express from "express";
import { PasskeyController } from "../controllers/passkey.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
import rateLimit from "express-rate-limit";
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
router.use(verify_access_token());
// -- auth/passkey
router.get('/register/:email', controller.start_registration);
router.post('/register', controller.complete_registration);
router.get('/', controller.get_auth_options);
router.post('/test', verify_passkey, (req, res) => {
    res.status(200).json({ message: "Hi user " + req.user.id });
});

export default router;