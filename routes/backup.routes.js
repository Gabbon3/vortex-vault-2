import express from "express";
import rateLimit from "express-rate-limit";
import { BackupController } from "../controllers/backup.controller.js";
import { verifyAuth, verifyShivPrivilegedToken } from "../middlewares/authMiddleware.js";
import { dpopAuthMiddleware } from "../middlewares/dpop.middlewares.js";
// import { Roles } from "../utils/roles.js";
// -- router
const router = express.Router();
// -- controller
const controller = new BackupController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- middleware
// -- /backup
router.post('/', express.raw({ type: 'application/octet-stream' }), dpopAuthMiddleware, controller.create);
router.use(dpopAuthMiddleware);
router.get('/', controller.get);
router.get('/:backup_id', controller.get_id);
router.delete('/:backup_id', controller.delete);

export default router;