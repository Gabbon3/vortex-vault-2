import express from "express";
import rateLimit from "express-rate-limit";
import { ShivController } from "../controllers/shiv.controller.js";
import { verifyAuth, verifyShivPrivilegedToken } from "../middlewares/authMiddleware.js";
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
router.post('/spt', verifyAuth(), controller.shivPrivilegedToken);
router.get('/session', verifyAuth(), controller.getAllSession);
router.patch('/session/:kid/name', verifyAuth(), controller.editDeviceName);
router.delete('/session/:kid', verifyAuth(), controller.deleteSession);
router.delete('/session', verifyAuth(), controller.deleteAllSession);

// API DI TEST
router.post('/spt-test', verifyShivPrivilegedToken, (req, res, next) => {
    res.status(200).json(req.ppt);
});

export default router;