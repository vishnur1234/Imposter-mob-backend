import { createRoomAtomic, joinRoomAtomic, patchRoom } from "../services/roomService.js";
import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
  try {
    const data = await createRoomAtomic(String(req.user._id), req.body);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const data = await joinRoomAtomic(req.params.roomCode, req.user._id);

    req.app.get("io").to(req.params.roomCode).emit("roomUpdated", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getRoom = async (req, res) => {
  try {
    const data = await Room.findOne({ roomCode: req.params.roomCode });

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

// @route  PATCH /api/rooms/:roomCode
// Firestore updateDoc()-style partial update: { set, arrayUnion, unset }.
// Broadcasts the new room state to everyone subscribed to this room's socket channel.
export const updateRoom = async (req, res) => {
  try {
    const data = await patchRoom(req.params.roomCode, req.body);

    req.app.get("io").to(req.params.roomCode).emit("roomUpdated", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
