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

    const alreadyInRoom = room.players.some((p) => p.uid === String(userId));
    if (!alreadyInRoom && room.players.length >= room.playersRequired) {
      throw new Error("ROOM_FULL");
    }

    if (!alreadyInRoom) {
      room.players.push({ uid: String(userId), name: user.playerName, score: 0 });
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

// Generic Firestore-updateDoc-style partial update: `set` merges plain fields
// (dot paths like "votes.uid" work as Mongo paths), `arrayUnion` appends a
// value (or values) to an array field without duplicating it, `unset` drops
// fields entirely (the deleteField() equivalent).
export const patchRoom = async (roomCode, { set = {}, arrayUnion = {}, unset = [] }) => {
  const update = {};

  if (Object.keys(set).length) update.$set = set;
  if (unset.length) update.$unset = Object.fromEntries(unset.map((f) => [f, ""]));
  if (Object.keys(arrayUnion).length) {
    update.$addToSet = Object.fromEntries(
      Object.entries(arrayUnion).map(([field, value]) => [
        field,
        Array.isArray(value) ? { $each: value } : value,
      ])
    );
  }

  const room = await Room.findOneAndUpdate({ roomCode }, update, { new: true });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  return room;
};
