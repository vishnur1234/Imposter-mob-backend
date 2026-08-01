import bcrypt from "bcryptjs";
import User from "../models/User.js";
import MatchHistory from "../models/MatchHistory.js";
import generateToken from "../utils/generateToken.js";
import { claimDailyReward as claimDailyRewardService } from "../services/gameService.js";

export const registerUser = async (req, res) => {
  try {
    const { email, password, playerName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, playerName });

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        playerName: user.playerName,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        playerName: user.playerName,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const data = await User.findById(req.user._id).select("-password");

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const claimDailyReward = async (req, res) => {
  try {
    const user = await claimDailyRewardService(req.user._id);
    const data = user.toObject();
    delete data.password;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { playerName } = req.body;

    const user = await User.findById(req.user._id);
    if (playerName && playerName.trim()) user.playerName = playerName.trim();
    await user.save();

    const data = user.toObject();
    delete data.password;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserPublic = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("playerName");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: { uid: user._id, name: user.playerName, playerName: user.playerName },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const entries = await MatchHistory.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit);

    return res.status(200).json({
      success: true,
      data: entries.map((e) => ({
        roomCode: e.roomCode,
        gameId: e.gameId,
        score: e.score,
        isEntryFee: e.isEntryFee,
        timestamp: e.createdAt.getTime(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getRankings = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const [top, totalUsers, higherCount] = await Promise.all([
      User.find().sort({ highScore: -1 }).limit(limit).select("playerName highScore"),
      User.countDocuments(),
      User.countDocuments({ highScore: { $gt: req.user.highScore } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        rankings: top.map((u) => ({ uid: u._id, name: u.playerName, highScore: u.highScore })),
        totalUsers,
        myRank: higherCount + 1,
        me: { uid: req.user._id, name: req.user.playerName, highScore: req.user.highScore },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
