import express from "express";
import { CkeController } from "../controllers/cke.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
import rateLimit from "express-rate-limit";
// -- router
const router = express.Router();
// -- controller
const controller = new CkeController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 250, // massimo 10 richieste per 2 minuti
    message: "Too many requests, try later",
});
router.use(limiter);
router.use(verify_access_token());
// -- auth/cke
router.post('/', controller.generate);
router.get('/', controller.get);

export default router;