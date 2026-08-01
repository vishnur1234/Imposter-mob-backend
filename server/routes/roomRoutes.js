import express from "express";
import { createRoom, joinRoom, getRoom, updateRoom } from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRoom);
router.post("/:roomCode/join", protect, joinRoom);
router.get("/:roomCode", protect, getRoom);
router.patch("/:roomCode", protect, updateRoom);

export default router;
