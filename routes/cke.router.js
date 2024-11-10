import express from "express";
import { CkeController } from "../controllers/cke.controller.js";
import { verify_access_token } from "../middlewares/authMiddleware.js";
// -- router
const router = express.Router();
// -- controller
const controller = new CkeController();
// -- middlewares
router.use(verify_access_token);
// -- auth/cke
router.post('/', controller.generate);
router.get('/', controller.get);

export default router;