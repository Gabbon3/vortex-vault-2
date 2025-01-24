import express from "express";
import rateLimit from "express-rate-limit";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
import { LSEController } from "../controllers/lse.controller.js";
// -- router
const router = express.Router();
// -- controller
const controller = new LSEController();
// -- middlewares
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- auth/lse
router.post('/set', verify_passkey(), controller.set);
router.post('/get', verify_passkey(), controller.get);

export default router;