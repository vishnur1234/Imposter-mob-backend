import express from "express";
import { submitScore } from "../controllers/gameController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:roomCode/score", protect, submitScore);

export default router;
