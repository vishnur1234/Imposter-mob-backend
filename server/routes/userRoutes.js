import express from "express";
import {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  claimDailyReward,
  getUserPublic,
  getHistory,
  getRankings,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getUser);
router.patch("/me", protect, updateUser);
router.post("/daily-reward", protect, claimDailyReward);
router.get("/history", protect, getHistory);
router.get("/rankings", protect, getRankings);
router.get("/:id/public", protect, getUserPublic);

export default router;
