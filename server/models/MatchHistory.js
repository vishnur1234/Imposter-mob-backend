import mongoose from "mongoose";

const matchHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomCode: { type: String, required: true },
    gameId: { type: String, required: true },
    score: { type: Number, required: true },
    isEntryFee: { type: Boolean, default: false },
  },
  { timestamps: true }
);

matchHistorySchema.index({ user: 1, gameId: 1, isEntryFee: 1 }, { unique: true });

export default mongoose.model("MatchHistory", matchHistorySchema);
