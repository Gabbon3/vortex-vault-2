import express from "express";
import rateLimit from "express-rate-limit";
import { VaultController } from "../controllers/vault.controller.js";
import { verifyAuth, verifyShivPrivilegedToken } from "../middlewares/authMiddleware.js";
import { Roles } from "../utils/roles.js";
// -- router
const router = express.Router();
// -- controller
const controller = new VaultController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 250,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- /vaults
// -- routes that require sudo access token
router.post('/restore', express.raw({ type: 'application/octet-stream' }), verifyAuth(), verifyShivPrivilegedToken, controller.restore);
// -- routes that require simple access token
router.use(verifyAuth());
router.post('/create', controller.create);
router.get('/count', controller.count);
router.get('/:vault_id', controller.get_id);
router.get('', controller.get);
router.post('/update', controller.update);
router.delete('/:vault_id', controller.delete);

export default router;