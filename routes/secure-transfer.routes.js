import express from "express";
import { verify_access_token } from "../middlewares/authMiddleware.js";
import { SecureTransferController } from "../controllers/secure-transfer.controller.js";
import rateLimit from "express-rate-limit";
// -- router
const router = express.Router();
// -- controller
const controller = new SecureTransferController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 250,
    message: "Too many requests, try later",
});
router.use(limiter);
// -- secure-transfer/
router.post('/', verify_access_token(), controller.set);
router.get('/:request_id', controller.get);

export default router;