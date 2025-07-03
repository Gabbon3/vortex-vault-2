import express from "express";
import rateLimit from "express-rate-limit";
import { ShivController } from "../controllers/shiv.controller.js";
import { dpopAuthMiddleware } from "../middlewares/dpop.middlewares.js";
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
router.get('/session', dpopAuthMiddleware, controller.getAllSession);
router.patch('/session/:kid/name', dpopAuthMiddleware, controller.editDeviceName);
router.delete('/session/:kid', dpopAuthMiddleware, controller.deleteSession);
router.delete('/session', dpopAuthMiddleware, controller.deleteAllSession);

export default router;