import express from "express";
import rateLimit from "express-rate-limit";
import { PublicKeyController } from "../controllers/publicKey.controller.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new PublicKeyController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * /public-key/*
 */
router.get('/', verifyAuth(), controller.getAllSession);
router.patch('/:sid/name', verifyAuth(), controller.editDeviceName);
router.delete('/:sid', verifyAuth({ advanced: true }), controller.deleteSession);
router.delete('/', verifyAuth({ advanced: true }), controller.deleteAllSession);

export default router;