import express from "express";
import rateLimit from "express-rate-limit";
// import { verifica_jwt } from "../middlewares/authMiddleware.js";
import { UserController } from "../controllers/user.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new UserController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minuti
    max: 20, // massimo 10 richieste per 2 minuti
    message: "Troppe richieste, riprova più tardi",
});
router.use(limiter);
// -- le routes con i controller associati
router.post('/registrati', controller.registra);
router.post('/accedi', controller.accedi);
router.post('/2fa', verify_access_token, controller.enable_2fa);
router.post('/2fa_test', verify_access_token, controller.test_2fa);

export default router;