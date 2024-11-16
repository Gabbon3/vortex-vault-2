import express from "express";
import rateLimit from "express-rate-limit";
import { VaultController } from "../controllers/vault.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new VaultController();
// -- rate Limiter per le auth routes
// const limiter = rateLimit({
//     windowMs: 1 * 60 * 1000,
//     max: 60,
//     message: "Troppe richieste, riprova più tardi",
// });
// router.use(limiter);
// -- middleware
router.use(verify_access_token);
// -- /vaults
router.post('/create', controller.create);
router.get('/count', controller.count);
router.get('/:vault_id', controller.get_id);
router.get('', controller.get);
router.post('/update', controller.update);
router.delete('/:vault_id', controller.delete);

export default router;