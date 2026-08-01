import mongoose from "mongoose";

// Player entries carry ad-hoc gameplay fields (isImposter, ready, ...) beyond
// the base shape, so they're left unvalidated here (strict: false).
const playerSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
);

// Rooms carry a large, evolving set of gameplay fields (gameStatus, hints,
// votes, turnOrder, gameData, ...) written directly by the client, mirroring
// the schemaless Firestore documents this replaces. strict: false lets any
// of those pass through instead of enumerating every one here.
const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    hostId: { type: String, required: true },
    players: { type: [playerSchema], default: [] },
    playersRequired: { type: Number, default: 4 },
    bettingAmount: { type: Number, default: 50 },
    gameMode: { type: String, default: "classic" },
    category: { type: String, default: null },
    selectedTopic: { type: String, default: null },
    totalRounds: { type: Number, default: 3 },
    clueTimer: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false, minimize: false }
);

export default mongoose.model("Room", roomSchema);
