import express from "express";
import rateLimit from "express-rate-limit";
import { BackupController } from "../controllers/backup.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new BackupController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: "Troppe richieste, riprova più tardi",
});
router.use(limiter);
// -- middleware
router.use(verify_access_token);
// -- /backup
router.post('/', controller.create);
router.get('/', controller.get);
router.get('/:backup_id', controller.get_id);
router.delete('/:backup_id', controller.delete);

export default router;