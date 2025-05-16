import express from "express";
import rateLimit from "express-rate-limit";
import { PulseController } from "../controllers/pulse.controller.js";
import { verifyAuth, verifyPulsePrivilegedToken } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new PulseController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * /pulse/*
 */
router.post('/spt', verifyAuth(), controller.shivPrivilegedToken);
router.get('/session', verifyAuth(), controller.getAllSession);
router.patch('/session/:kid/name', verifyAuth(), controller.editDeviceName);
router.delete('/session/:kid', verifyAuth(), controller.deleteSession);
router.delete('/session', verifyAuth(), controller.deleteAllSession);

// API DI TEST
router.post('/spt-test', verifyPulsePrivilegedToken, (req, res, next) => {
    res.status(200).json(req.ppt);
});

export default router;