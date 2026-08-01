import { api } from "../api/client";

/**
 * Saves a user's match score (or entry fee) to history and updates their
 * total coin balance. Deduping on (gameId, isEntryFee) happens server-side.
 */
export const saveUserScoreToHistory = async (uid, name, roomCode, gameId, score, isEntryFee = false) => {
  if (!uid || uid === "guest") return;
  try {
    await api.post(`/games/${roomCode}/score`, { gameId, score, isEntryFee });
  } catch (error) {
    console.error("Error saving user match score:", error);
  }
};

/**
 * Claims the daily reward. The server enforces the 24h cooldown.
 */
export const claimDailyReward = async (uid) => {
  if (!uid || uid === "guest") return;
  return api.post("/users/daily-reward", {});
};

export const getMyStats = () => api.get("/users/me");

export const updateMyProfile = (playerName) => api.patch("/users/me", { playerName });

export const getUserStatsById = (uid) => api.get(`/users/${uid}/public`);

export const getHistory = (limit = 30) => api.get(`/users/history?limit=${limit}`);

export const getRankings = (limit = 50) => api.get(`/users/rankings?limit=${limit}`);
