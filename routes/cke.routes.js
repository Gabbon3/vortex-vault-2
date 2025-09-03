import express from "express";
import { CKEController } from "../controllers/cke.controller.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";
import rateLimit from "express-rate-limit";
import { verifyPasskey } from "../middlewares/passkey.middleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new CKEController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- auth/cke
router.post('/set', verifyAuth(), verifyPasskey(), controller.set);
router.get('/get/basic', verifyAuth({ checkIntegrity: false }), controller.getBasic);
router.get('/get/advanced', verifyAuth({ checkIntegrity: true }), controller.getAdvanced);
// TODO: aggiungere un PIN al posto della passkey poiché è sgravato
// router.post('/get/advanced', verifyPasskey(), controller.getAdvanced);

export default router;