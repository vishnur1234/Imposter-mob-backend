import { api } from "../api/client";
import { getSocket } from "../api/socket";

// Sentinels mirroring Firestore's arrayUnion()/deleteField(), kept so
// updateRoom() call sites read exactly like the old updateDoc() calls.
const ARRAY_UNION = "__arrayUnion";
const DELETE_FIELD = "__deleteField";

export const arrayUnion = (value) => ({ __op: ARRAY_UNION, value });
export const deleteField = () => ({ __op: DELETE_FIELD });

/**
 * Creates a multiplayer room. The server generates the unique room code.
 */
export const createRoomAtomic = async (roomData) => {
  const room = await api.post("/rooms", roomData);
  return room.roomCode;
};

/**
 * Joins a room, verifying capacity and entry-fee balance server-side.
 */
export const joinRoomAtomic = async (roomCode) => {
  return api.post(`/rooms/${roomCode}/join`, {});
};

export const getRoom = async (roomCode) => {
  return api.get(`/rooms/${roomCode}`);
};

/**
 * Firestore updateDoc()-style partial update: plain values are merged,
 * arrayUnion(value) appends without duplicating, deleteField() drops the key.
 */
export const updateRoom = async (roomCode, updates) => {
  const set = {};
  const arrayUnionFields = {};
  const unset = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === "object" && value.__op === ARRAY_UNION) {
      arrayUnionFields[key] = value.value;
    } else if (value && typeof value === "object" && value.__op === DELETE_FIELD) {
      unset.push(key);
    } else {
      set[key] = value;
    }
  }

  return api.patch(`/rooms/${roomCode}`, { set, arrayUnion: arrayUnionFields, unset });
};

/**
 * Subscribes to realtime updates for a room (replaces Firestore onSnapshot).
 * Fires immediately with the current room state, then again on every change.
 * Returns an unsubscribe function.
 */
export const subscribeToRoom = (roomCode, callback) => {
  let active = true;
  const socket = getSocket();

  const handleUpdate = (room) => {
    if (active && room && room.roomCode === roomCode) callback(room);
  };

  socket.emit("joinRoomChannel", roomCode);
  socket.on("roomUpdated", handleUpdate);

  getRoom(roomCode)
    .then((room) => { if (active) callback(room); })
    .catch((err) => console.error("Error fetching room:", err));

  return () => {
    active = false;
    socket.off("roomUpdated", handleUpdate);
    socket.emit("leaveRoomChannel", roomCode);
  };
};
