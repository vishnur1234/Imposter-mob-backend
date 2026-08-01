import mongoose from "mongoose";
import User from "../models/User.js";
import MatchHistory from "../models/MatchHistory.js";

export const saveUserScoreToHistory = async (userId, roomCode, gameId, score, isEntryFee = false) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const exists = await MatchHistory.findOne({ user: userId, gameId, isEntryFee }).session(session);
    if (exists) {
      await session.abortTransaction();
      return;
    }

    await MatchHistory.create([{ user: userId, roomCode, gameId, score, isEntryFee }], { session });

    const update = { $inc: { highScore: score } };
    if (!isEntryFee) update.$inc.totalMatches = 1;

    await User.findByIdAndUpdate(userId, update, { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const claimDailyReward = async (userId) => {
  const dayInMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const user = await User.findById(userId);

  if (now - (user.lastDailyRewardClaimed || 0) < dayInMs) {
    throw new Error("Daily reward is not claimable yet.");
  }

  user.highScore += 500;
  user.lastDailyRewardClaimed = now;
  await user.save();

  await MatchHistory.create({
    user: userId,
    roomCode: "DAILY",
    gameId: "DAILY_" + Math.random().toString(36).substring(2, 6).toUpperCase(),
    score: 500,
    isEntryFee: false,
  });

  return user;
};
