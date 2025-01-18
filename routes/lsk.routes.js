import express from "express";
import { LSKController } from "../controllers/lsk.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
import rateLimit from "express-rate-limit";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new LSKController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- auth/cke
router.post('/', verify_access_token(), controller.generate);
router.get('/', verify_passkey, controller.get);

export default router;