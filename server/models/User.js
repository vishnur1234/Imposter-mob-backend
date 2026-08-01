import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    playerName: { type: String, required: true },
    highScore: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    lastDailyRewardClaimed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
