import express from "express";
import rateLimit from "express-rate-limit";
import { ShivController } from "../controllers/shiv.controller.js";
import { authSelector, verifyAuth, verifyShivPrivilegedToken } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new ShivController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * /shiv/*
 */
router.get('/session', verifyAuth(), controller.getAllSession);
router.patch('/session/:kid/name', verifyAuth(), controller.editDeviceName);
router.delete('/session/:kid', verifyAuth(), verifyShivPrivilegedToken, controller.deleteSession);
router.delete('/session', verifyAuth(), verifyShivPrivilegedToken, controller.deleteAllSession);
// Genera SPT
router.post('/spt', authSelector(['psk', 'otp']), controller.shivPrivilegedToken);

// API DI TEST
router.post('/spt-test', verifyShivPrivilegedToken, (req, res, next) => {
    res.status(200).json(req.ppt);
});

export default router;