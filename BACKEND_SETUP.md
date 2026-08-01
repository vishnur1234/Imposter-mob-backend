# Custom Backend Setup — ImposterGame

This document is a full setup guide for replacing Firebase (Auth + Firestore) with a
custom Node.js + Express + MongoDB backend. It mirrors the data your app already uses
(`rooms`, `user_stats`, match history) so the migration from Firestore is mostly a
find-and-replace of the client calls, not a redesign.

---

## 1. Why / What changes

| Concern | Current (Firebase) | New (Custom backend) |
|---|---|---|
| Auth | Firebase Auth | Express + JWT + bcrypt |
| Data | Firestore (`rooms`, `user_stats`, `user_stats/{uid}/history`) | MongoDB collections (`users`, `rooms`, `matchhistories`) |
| Realtime room sync | Firestore `onSnapshot` listeners | Socket.IO (see §9) |
| Atomic writes | `runTransaction` | Mongoose sessions / MongoDB transactions |

The app talks to the API over plain HTTPS (axios/fetch) instead of the `firebase` SDK.

---

## 2. Folder structure

Create this as a **separate project** (e.g. `server/` at the repo root, or its own repo)
— it is not bundled into the Expo app.

```
server/
├── server.js                  # entry point
├── .env
├── package.json
├── config/
│   └── db.js                  # mongoose connection
├── routes/
│   ├── userRoutes.js
│   ├── roomRoutes.js
│   └── gameRoutes.js
├── controllers/
│   ├── userController.js
│   ├── roomController.js
│   └── gameController.js
├── services/
│   ├── userService.js
│   ├── roomService.js
│   └── gameService.js
├── models/
│   ├── User.js
│   ├── Room.js
│   └── MatchHistory.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── sockets/
│   └── roomSocket.js
└── utils/
    ├── generateRoomCode.js
    └── generateToken.js
```

---

## 3. package.json

```json
{
  "name": "impostergame-server",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.5.0",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

## 4. .env

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/impostergame
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=30d
```

---

## 5. server.js (base setup)

```js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import registerRoomSocket from "./sockets/roomSocket.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/games", gameRoutes);

app.get("/api/health", (req, res) => res.status(200).json({ success: true, data: "ok" }));

// error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
registerRoomSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## 6. config/db.js

```js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
```

---

## 7. Models (mapped from your existing Firestore fields)

### models/User.js
Maps `user_stats/{uid}` in Firestore.

```js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    playerName: { type: String, required: true },
    highScore: { type: Number, default: 0 },       // coins balance
    totalMatches: { type: Number, default: 0 },
    lastDailyRewardClaimed: { type: Number, default: 0 }, // epoch ms
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
```

### models/Room.js
Maps the `rooms/{roomCode}` document.

```js
import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    players: { type: [playerSchema], default: [] },
    playersRequired: { type: Number, default: 4 },
    bettingAmount: { type: Number, default: 50 },
    gameMode: { type: String, default: "classic" },
    category: { type: String, default: null },
    selectedTopic: { type: String, default: null },
    totalRounds: { type: Number, default: 3 },
    clueTimer: { type: Number, default: 0 },
    status: { type: String, enum: ["waiting", "in_progress", "finished"], default: "waiting" },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
```

### models/MatchHistory.js
Maps `user_stats/{uid}/history/{matchId}`.

```js
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

// prevents double-recording the same scoring event (equivalent to the
// Firestore matchId-as-doc-id dedupe check)
matchHistorySchema.index({ user: 1, gameId: 1, isEntryFee: 1 }, { unique: true });

export default mongoose.model("MatchHistory", matchHistorySchema);
```

---

## 8. Middleware

### middleware/authMiddleware.js

```js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};
```

### middleware/errorMiddleware.js

```js
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found - ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message,
  });
};
```

---

## 9. Services (business logic, mirrors your `roomService.js` / `statsService.js`)

### services/roomService.js

```js
import mongoose from "mongoose";
import Room from "../models/Room.js";
import User from "../models/User.js";
import generateRoomCode from "../utils/generateRoomCode.js";

export const createRoomAtomic = async (hostId, roomData) => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const roomCode = generateRoomCode();
    try {
      const room = await Room.create({ ...roomData, roomCode, hostId });
      return room;
    } catch (err) {
      // duplicate roomCode -> retry with a new one
      if (err.code === 11000) {
        attempts++;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to generate a unique room code. Please try again.");
};

export const joinRoomAtomic = async (roomCode, userId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const room = await Room.findOne({ roomCode }).session(session);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const user = await User.findById(userId).session(session);
    const requiredCoins = room.bettingAmount ?? 50;

    if (user.highScore < requiredCoins) {
      throw new Error(`INSUFFICIENT_COINS:${requiredCoins}`);
    }

    const alreadyInRoom = room.players.some((p) => p.uid.equals(userId));
    if (!alreadyInRoom && room.players.length >= room.playersRequired) {
      throw new Error("ROOM_FULL");
    }

    if (!alreadyInRoom) {
      room.players.push({ uid: userId, name: user.playerName, score: 0 });
      await room.save({ session });
    }

    await session.commitTransaction();
    return room;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
```

### services/gameService.js (mirrors `statsService.js`)

```js
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
      return; // already recorded, no-op (matches Firestore dedupe behavior)
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
```

---

## 10. Controllers (your requested style, in Express `res` form)

### controllers/userController.js

```js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { claimDailyReward as claimDailyRewardService } from "../services/gameService.js";

// @route  POST /api/users/register
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

// @route  POST /api/users/login
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

// @route  GET /api/users/me
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

// @route  POST /api/users/daily-reward
export const claimDailyReward = async (req, res) => {
  try {
    const data = await claimDailyRewardService(req.user._id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
```

### controllers/roomController.js

```js
import { createRoomAtomic, joinRoomAtomic } from "../services/roomService.js";
import Room from "../models/Room.js";

// @route  POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const data = await createRoomAtomic(req.user._id, req.body);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/rooms/:roomCode/join
export const joinRoom = async (req, res) => {
  try {
    const data = await joinRoomAtomic(req.params.roomCode, req.user._id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// @route  GET /api/rooms/:roomCode
export const getRoom = async (req, res) => {
  try {
    const data = await Room.findOne({ roomCode: req.params.roomCode }).populate("players.uid", "playerName");

    if (!data) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
```

---

## 11. Routes

### routes/userRoutes.js

```js
import express from "express";
import { registerUser, loginUser, getUser, claimDailyReward } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getUser);
router.post("/daily-reward", protect, claimDailyReward);

export default router;
```

### routes/roomRoutes.js

```js
import express from "express";
import { createRoom, joinRoom, getRoom } from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRoom);
router.post("/:roomCode/join", protect, joinRoom);
router.get("/:roomCode", protect, getRoom);

export default router;
```

`routes/gameRoutes.js` follows the same pattern for score submission endpoints
(`POST /api/games/:roomCode/score` → calls `saveUserScoreToHistory`).

---

## 12. Utils

### utils/generateToken.js

```js
import jwt from "jsonwebtoken";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "30d" });

export default generateToken;
```

### utils/generateRoomCode.js

```js
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default generateRoomCode;
```

---

## 13. Realtime room sync (replacing Firestore `onSnapshot`)

Firestore gave you live room updates for free via `onSnapshot`. MongoDB has no
equivalent, so add Socket.IO: clients join a room-code channel, and any controller
that mutates a `Room` document emits an update to that channel.

### sockets/roomSocket.js

```js
const registerRoomSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("joinRoomChannel", (roomCode) => {
      socket.join(roomCode);
    });

    socket.on("disconnect", () => {});
  });
};

export default registerRoomSocket;
```

From `roomController.js`, after a successful join/update, emit to the room:
```js
req.app.get("io").to(roomCode).emit("roomUpdated", data);
```
(expose `io` via `app.set("io", io)` in `server.js`.)

On the client (Expo), replace Firestore's `onSnapshot(roomRef, ...)` with a
`socket.io-client` listener on the `"roomUpdated"` event for that room code.

---

## 14. Firestore → MongoDB field mapping (for the migration itself)

| Firestore | MongoDB | Notes |
|---|---|---|
| `user_stats/{uid}` | `users` collection | `uid` (Firebase) → Mongo `_id`; `highScore` stays as the coins field name |
| `user_stats/{uid}/history/{matchId}` | `matchhistories` collection, `user` field references the user | unique index on `(user, gameId, isEntryFee)` replaces the doc-id dedupe |
| `rooms/{roomCode}` | `rooms` collection | `roomCode` kept as a unique field instead of the doc ID |
| Firebase Auth | `users.email` + `users.password` (bcrypt) + JWT | client stores the JWT instead of a Firebase ID token |

Files in the Expo app to touch when swapping in the new API:
- [src/firebase/firebase.js](src/firebase/firebase.js) — replace with an `src/api/client.js` axios instance pointed at the new server, carrying the JWT in an `Authorization` header.
- [src/services/roomService.js](src/services/roomService.js) — replace Firestore transaction calls with `POST /api/rooms`, `POST /api/rooms/:roomCode/join`.
- [src/services/statsService.js](src/services/statsService.js) — replace with `POST /api/games/:roomCode/score`, `POST /api/users/daily-reward`.
- [src/context/AuthContext.js](src/context/AuthContext.js) — replace Firebase Auth calls with `POST /api/users/register` / `login`, store JWT in `AsyncStorage`.

---

## 15. Running it

```bash
cd server
npm install
npm run dev
```

Health check: `GET http://localhost:5000/api/health`
