import express from "express";
import { verifyAuth } from "../middlewares/authMiddleware.js";
import { SecureLinkController } from "../controllers/secure-link.controller.js";
import rateLimit from "express-rate-limit";
// -- router
const router = express.Router();
// -- controller
const controller = new SecureLinkController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs:  60 * 1000,
    max: 50,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- secure-link/
router.post('/', verifyAuth(), controller.generate_secret);
router.post('/id', controller.generate_id);
router.get('/:scope_id', controller.get_secret);

export default router;