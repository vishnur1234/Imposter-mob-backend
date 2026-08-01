import { saveUserScoreToHistory } from "../services/gameService.js";

export const submitScore = async (req, res) => {
  try {
    const { gameId, score, isEntryFee } = req.body;

    await saveUserScoreToHistory(req.user._id, req.params.roomCode, gameId, score, isEntryFee);

    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
