import React, { useState, useEffect, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { subscribeToRoom, updateRoom, arrayUnion, deleteField } from "../services/roomService";
import { generateTopic } from "../services/generateTopic";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";
import { saveUserScoreToHistory } from "../services/statsService";

const { width } = Dimensions.get("window");


export default function GamePlayScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { roomCode, course, isHost } = route.params || {};

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [secRemaining, setSecRemaining] = useState(60);

  // Phase-specific local states
  const [revealed, setRevealed] = useState(false);
  const [hintInput, setHintInput] = useState("");
  const [selectedVoteUid, setSelectedVoteUid] = useState(null);
  const [bonusGuess, setBonusGuess] = useState("");

  const myUid = auth.currentUser?.uid || "guest";
  const recordedGamesRef = useRef([]);
  const paidGamesRef = useRef([]);

  const handleQuit = () => {
    Alert.alert(
      "Quit Game",
      "Are you sure you want to quit and return to the main menu?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Quit", style: "destructive", onPress: () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }) }
      ]
    );
  };

  // Firestore Snapshot Listener
  useEffect(() => {
    if (!roomCode) {
      Alert.alert("Error", "Missing room code.");
      navigation.navigate("Home");
      return;
    }

    const unsub = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoomData(data);
        setLoading(false);

        // Auto Transition Logic
        // 1. Role Reveal -> Round transition (Only host checks and updates)
        if (isHost && data.gameStatus === "reveal") {
          const totalPlayers = data.players || [];
          const readyList = data.readyPlayers || [];
          if (totalPlayers.length > 0 && readyList.length >= totalPlayers.length) {
            updateRoom(roomCode, {
              gameStatus: "round",
              readyPlayers: [], // reset
            }).catch(err => console.log("Failed to transition to round:", err));
          }
        }

        // 2. Voting -> Results transition (Only host checks and updates)
        if (isHost && data.gameStatus === "voting") {
          const totalPlayers = data.players || [];
          const votesMap = data.votes || {};
          if (totalPlayers.length > 0 && Object.keys(votesMap).length >= totalPlayers.length) {
            updateRoom(roomCode, {
              gameStatus: "results",
            }).catch(err => console.log("Failed to transition to results:", err));
          }
        }

        // 3. Record match score when game conclusions reach leaderboard (each client records their own)
        if (data.gameStatus === "leaderboard") {
          const myPlayerObj = (data.players || []).find(p => p.uid === myUid);
          if (myPlayerObj) {
            const gameId = data.gameId || roomCode;
            if (!recordedGamesRef.current.includes(gameId)) {
              recordedGamesRef.current.push(gameId);
              saveUserScoreToHistory(myUid, myPlayerObj.name, roomCode, gameId, myPlayerObj.score);
            }
          }
        }

        // 5. Entry Fee Deduction when game transitions to reveal/round
        if (data.gameStatus === "reveal" || data.gameStatus === "round") {
          const gameId = data.gameId || roomCode;
          if (!paidGamesRef.current.includes(gameId)) {
            paidGamesRef.current.push(gameId);
            const myPlayerObj = (data.players || []).find(p => p.uid === myUid) || { name: "Player" };
            const entryFee = Number(data.bettingAmount || 50);
            saveUserScoreToHistory(myUid, myPlayerObj.name, roomCode, gameId, -entryFee, true);
          }
        }

        // 4. Clue Turn Timing (Only host sets when turn changes and timer is enabled)
        if (isHost && data.gameStatus === "round" && data.clueTimer > 0) {
          const roundHints = (data.hints || []).filter(h => h.round === (data.currentRound || 1));
          const currentTurnIndex = roundHints.length;
          if (currentTurnIndex < (data.players || []).length) {
            if (data.turnIndex !== currentTurnIndex) {
              updateRoom(roomCode, {
                turnIndex: currentTurnIndex,
                turnStartedAt: Date.now()
              }).catch(err => console.log("Failed to set turnIndex/turnStartedAt:", err));
            }
          }
        }
      } else {
        Alert.alert("Error", "Room not found.");
        navigation.navigate("Home");
      }
    });

    return unsub;
  }, [roomCode, isHost]);

  // Clue Turn Timer Ticker
  useEffect(() => {
    if (!roomData || roomData.gameStatus !== "round") return;

    const roundHints = (roomData.hints || []).filter(h => h.round === (roomData.currentRound || 1));
    const currentTurnIndex = roundHints.length;
    const totalPlayersList = roomData.players || [];
    if (currentTurnIndex >= totalPlayersList.length) return;

    const limit = roomData.clueTimer !== undefined ? roomData.clueTimer : 60;
    if (limit <= 0) {
      setSecRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - (roomData.turnStartedAt || now)) / 1000);
      const rem = Math.max(0, limit - elapsed);
      setSecRemaining(rem);

      if (rem === 0) {
        const isMyTurn = totalPlayersList[currentTurnIndex]?.uid === myUid;
        if (isMyTurn) {
          const myPlayerName = totalPlayersList.find(p => p.uid === myUid)?.name || "You";
          updateRoom(roomCode, {
            hints: arrayUnion({
              round: roomData.currentRound || 1,
              uid: myUid,
              name: myPlayerName,
              hint: "PASS"
            })
          }).catch(err => console.log("Failed to auto-submit clue:", err));
        } else if (isHost && elapsed >= limit + 3) {
          const targetPlayer = totalPlayersList[currentTurnIndex];
          if (targetPlayer) {
            updateRoom(roomCode, {
              hints: arrayUnion({
                round: roomData.currentRound || 1,
                uid: targetPlayer.uid,
                name: targetPlayer.name,
                hint: "PASS"
              })
            }).catch(err => console.log("Failed to force pass clue:", err));
          }
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roomData?.turnStartedAt, roomData?.turnIndex, roomData?.gameStatus, roomData?.currentRound, roomData?.hints?.length]);

  if (loading || !roomData) {
    return (
      <LinearGradient colors={colors.gradientBg} style={styles.centerBg}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 12 }]}>Loading Game State...</Text>
      </LinearGradient>
    );
  }

  const {
    players = [],
    gameStatus = "reveal",
    currentRound = 1,
    totalRounds = 3,
    gameData = {},
    readyPlayers = [],
    hints = [],
    votes = {},
  } = roomData;

  const myPlayerObj = players.find(p => p.uid === myUid) || { name: "You", score: 0 };
  const isImposter = gameData.imposterId === myUid;
  const imposterPlayer = players.find(p => p.uid === gameData.imposterId);



  // 1. Confirm understanding of role
  const handleConfirmRole = async () => {
    setSubmitting(true);
    try {
      await updateRoom(roomCode, {
        readyPlayers: arrayUnion(myUid)
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Hint submission
  const handleHintSubmit = async () => {
    const cleanHint = hintInput.trim();
    if (!cleanHint) {
      Alert.alert("Invalid Input", "Please enter a hint.");
      return;
    }
    if (cleanHint.split(/\s+/).length > 1) {
      Alert.alert("Rule Exception", "Your hint must be exactly ONE word.");
      return;
    }

    setSubmitting(true);
    try {
      await updateRoom(roomCode, {
        hints: arrayUnion({
          round: currentRound,
          uid: myUid,
          name: myPlayerObj.name,
          hint: cleanHint
        })
      });
      setHintInput("");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Next round or end round phase
  const handleProceedRound = async (endEarly = false) => {
    setSubmitting(true);
    try {
      if (currentRound < totalRounds && !endEarly) {
        await updateRoom(roomCode, {
          currentRound: currentRound + 1
        });
      } else {
        await updateRoom(roomCode, {
          gameStatus: "voting"
        });
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Cast vote
  const handleVoteSubmit = async () => {
    if (!selectedVoteUid) {
      Alert.alert("Voting Required", "Please choose a suspect.");
      return;
    }

    setSubmitting(true);
    try {
      await updateRoom(roomCode, {
        [`votes.${myUid}`]: selectedVoteUid
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Imposter Bonus Guess Submission & Scoring Calculation
  const handleBonusSubmit = async () => {
    const cleanGuess = bonusGuess.trim();
    if (!cleanGuess) {
      Alert.alert("Input Required", "Please enter your guess.");
      return;
    }

    setSubmitting(true);
    try {
      const actualAnswer = gameData.answer || "";
      const correct = cleanGuess.toLowerCase() === actualAnswer.toLowerCase();

      // Tabulate final points
      const imposterId = gameData.imposterId;
      const votesArray = Object.values(votes);
      const imposterVotes = votesArray.filter(v => v === imposterId).length;

      // Find max votes any other player received to check survival
      const otherVotesCount = {};
      players.forEach(p => {
        if (p.uid !== imposterId) {
          otherVotesCount[p.uid] = votesArray.filter(v => v === p.uid).length;
        }
      });
      const maxOtherVotes = Math.max(0, ...Object.values(otherVotesCount));
      const imposterCaught = imposterVotes >= maxOtherVotes && imposterVotes > 0;
      const imposterSurvives = !imposterCaught;

      // Compute winners and losers
      const winners = [];
      const losers = [];

      // The Imposter is a Winner if they survived; otherwise a Loser
      if (imposterSurvives) {
        winners.push(imposterId);
      } else {
        losers.push(imposterId);
      }

      // Each student is a Winner if they correct voted for the Imposter; otherwise a Loser
      players.forEach(p => {
        if (p.uid !== imposterId) {
          const votedForUid = votes[p.uid];
          if (votedForUid === imposterId) {
            winners.push(p.uid);
          } else {
            losers.push(p.uid);
          }
        }
      });

      // Calculate pot and payouts
      const entryFee = Number(roomData?.bettingAmount || 50);
      const totalPlayersCount = players.length;
      const totalPot = totalPlayersCount * entryFee;

      const winnerEarnedShare = winners.length > 0 ? Math.floor(totalPot / winners.length) : 0;

      const updatedPlayers = players.map(player => {
        let earned = 0;
        if (winners.includes(player.uid)) {
          earned = winnerEarnedShare;
        } else {
          earned = 0;
        }
        if (player.uid === imposterId && correct) {
          earned += entryFee;
        }
        return {
          ...player,
          score: earned
        };
      });

      await updateRoom(roomCode, {
        players: updatedPlayers,
        gameStatus: "leaderboard",
        imposterGuess: cleanGuess,
        imposterGuessCorrect: correct,
        imposterSurvives
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Play Again Lobby reset
  const handlePlayAgain = async () => {
    setSubmitting(true);
    try {
      const topic = await generateTopic(course || roomData.category);
      if (!topic || !topic.answer) {
        throw new Error("Failed to generate a valid topic.");
      }

      const nextImposter = players[Math.floor(Math.random() * players.length)];
      const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const resetPlayers = players.map(p => ({
        ...p,
        score: 0
      }));

      await updateRoom(roomCode, {
        gameStatus: "reveal",
        currentRound: 1,
        players: resetPlayers,
        gameData: {
          answer: topic.answer,
          clue: topic.clue || "",
          imposterId: nextImposter.uid
        },
        votes: {},
        hints: [],
        readyPlayers: [],
        topic, // compatibility
        imposterIndex: players.findIndex(p => p.uid === nextImposter.uid), // compatibility
        gameId: newGameId,
        imposterGuess: deleteField(),
        imposterGuessCorrect: deleteField(),
        imposterSurvives: deleteField()
      });
      setRevealed(false);
      setHintInput("");
      setSelectedVoteUid(null);
      setBonusGuess("");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── RENDERS FOR DIFFERENT PHASES ──────────────────────────────────────────

  // Phase A: Role Reveal Screen
  const renderRevealScreen = () => {
    const isReady = readyPlayers.includes(myUid);
    const clueList = gameData.clue ? [gameData.clue] : [];

    return (
      <View style={styles.cardContainer}>
        {!revealed ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.courseBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="school-outline" size={11} color={colors.primary} />
                <Text style={[styles.courseBadgeText, typography.sub8, { color: colors.primary }]}>{course || roomData.category}</Text>
              </View>
              <Text style={[typography.sub7, { color: colors.textSecondary }]}>ROLE REVEAL</Text>
            </View>

            <View style={[styles.avatarLarge, { backgroundColor: colors.primaryLight, shadowColor: colors.primary, overflow: "hidden" }]}>
              <Image
                source={getAvatarByIndex(players.findIndex(p => p.uid === myUid))}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>

            <Text style={[styles.playerNameLarge, typography.h3, { color: colors.textPrimary }]}>{myPlayerObj.name}</Text>
            <Text style={[styles.hiddenSub, typography.body2, { color: colors.textSecondary }]}>
              Tap below to view your secret role. Keep it hidden from others!
            </Text>

            <TouchableOpacity onPress={() => setRevealed(true)} activeOpacity={0.85} style={styles.fullWidthBtn}>
              <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                <Ionicons name="eye-outline" size={20} color="#FFF" />
                <Text style={[styles.btnText, typography.btn1]}>Reveal My Card</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.card,
            isImposter ? styles.cardRed : styles.cardGreen,
            {
              backgroundColor: isImposter
                ? (colors.isDark ? "rgba(211,47,47,0.1)" : "#FEF2F2")
                : (colors.isDark ? "rgba(0,185,111,0.1)" : "#ECFDF5"),
              borderColor: isImposter ? colors.error : colors.success
            }
          ]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.playerNameSmall, typography.sub7, { color: colors.textSecondary }]}>{myPlayerObj.name}</Text>
              <Text style={[typography.body3, { color: colors.textSecondary }]}>ROLE REVEALED</Text>
            </View>

            {isImposter ? (
              <View style={styles.roleWrap}>
                <Ionicons name="alert-circle" size={52} color={colors.error} style={{ marginBottom: 8 }} />
                <Text style={[styles.roleIntro, typography.sub2, { color: colors.textSecondary }]}>YOU ARE THE</Text>
                <Text style={[styles.roleTitleRed, typography.h1, { color: colors.error }]}>IMPOSTER</Text>

                {clueList.length > 0 && (
                  <>
                    <Text style={[styles.clueIntro, typography.body2, { color: colors.textSecondary }]}>
                      Guess the topic using this clue:
                    </Text>
                    <View style={styles.clueList}>
                      {clueList.map((clue, idx) => (
                        <View key={idx} style={[styles.clueItem, { backgroundColor: colors.isDark ? "#000000" : "#FFFFFF", borderColor: colors.border }]}>
                          <View style={[styles.clueNumber, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.15)" : "#FEF2F2" }]}>
                            <Text style={[styles.clueNumberText, typography.btn2, { color: colors.error }]}>{String(idx + 1).padStart(2, "0")}</Text>
                          </View>
                          <Text style={[styles.clueText, typography.body1, { color: colors.textPrimary }]}>{clue}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.roleWrap}>
                <Ionicons name="checkmark-circle" size={52} color={colors.success} style={{ marginBottom: 8 }} />
                <Text style={[styles.roleIntro, typography.sub2, { color: colors.textSecondary }]}>YOUR SECRET TOPIC IS</Text>

                <LinearGradient
                  colors={colors.isDark ? ["rgba(0,185,111,0.15)", "rgba(0,185,111,0.02)"] : ["#ECFDF5", "#F0FDF4"]}
                  style={[styles.topicBox, { borderColor: colors.isDark ? "rgba(0,185,111,0.25)" : "rgba(16,185,129,0.2)" }]}
                >
                  <Text style={[styles.topicText, typography.h2, { color: colors.success }]}>{gameData.answer}</Text>
                </LinearGradient>
                <Text style={[styles.topicHint, typography.body2, { color: colors.textSecondary }]}>
                  Describe it in <Text style={{ color: colors.success, fontWeight: "bold" }}>one word</Text>. Avoid making it too easy for the imposter!
                </Text>
              </View>
            )}

            {isReady ? (
              <View style={[styles.readyPill, { backgroundColor: colors.isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5" }]}>
                <ActivityIndicator size="small" color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[typography.body2, { color: colors.success }]}>
                  Waiting for other players ({readyPlayers.length}/{players.length})...
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleConfirmRole} disabled={submitting} activeOpacity={0.85} style={styles.fullWidthBtn}>
                <LinearGradient colors={colors.gradientSuccess} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#FFF" />
                      <Text style={[styles.btnText, typography.btn1]}>I UNDERSTAND</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Phase B: Round Phase Screen
  const renderRoundScreen = () => {
    const roundHints = hints.filter(h => h.round === currentRound);

    // Turn-based logic: players submit hints in the order of the players array
    const currentTurnIndex = roundHints.length;
    const isMyTurn = currentTurnIndex < players.length && players[currentTurnIndex]?.uid === myUid;
    const activeTurnPlayer = currentTurnIndex < players.length ? players[currentTurnIndex] : null;

    const roundHintsCompleted = roundHints.length === players.length;

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.courseBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.courseBadgeText, typography.sub8, { color: colors.primary }]}>ROUND {currentRound} OF {totalRounds}</Text>
            </View>
            <Text style={[typography.sub7, { color: colors.textSecondary }]}>HINTS PHASE</Text>
          </View>

          {/* Subtitle / Turn Instructions */}
          {!roundHintsCompleted ? (
            <View style={styles.turnIndicator}>
              {isMyTurn ? (
                <View style={{ alignItems: "center" }}>
                  <Text style={[typography.body1, { color: colors.success, fontWeight: "bold", textAlign: "center" }]}>
                    ⚡ IT'S YOUR TURN! Submit a one-word hint.
                  </Text>
                  {roomData.clueTimer > 0 ? (
                    <View style={[styles.timerPill, { backgroundColor: secRemaining <= 10 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", borderColor: secRemaining <= 10 ? colors.error : colors.success }]}>
                      <Ionicons name="time" size={14} color={secRemaining <= 10 ? colors.error : colors.success} />
                      <Text style={[typography.body3, { color: secRemaining <= 10 ? colors.error : colors.success, fontWeight: "bold" }]}>
                        Time Left: {secRemaining}s
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.timerPill, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[typography.body3, { color: colors.textSecondary, fontWeight: "500" }]}>
                        No Limit
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center" }]}>
                    Waiting for <Text style={{ color: colors.primary, fontWeight: "bold" }}>{activeTurnPlayer?.name}</Text> to submit hint...
                  </Text>
                  {roomData.clueTimer > 0 ? (
                    <View style={[styles.timerPill, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[typography.body3, { color: colors.textSecondary, fontWeight: "500" }]}>
                        Time Left: {secRemaining}s
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.timerPill, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[typography.body3, { color: colors.textSecondary, fontWeight: "500" }]}>
                        No Limit
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.turnIndicator}>
              <Text style={[typography.body1, { color: colors.success, fontWeight: "bold", textAlign: "center" }]}>
                ✅ All hints submitted for Round {currentRound}!
              </Text>
            </View>
          )}

          {/* List of hints submitted in the current round */}
          <ScrollView style={styles.hintsScroll} contentContainerStyle={{ gap: 10 }}>
            {roundHints.map((hintObj, idx) => (
              <View
                key={idx}
                style={[
                  styles.hintRow,
                  {
                    backgroundColor: colors.isDark ? "#0A0A0A" : "#F8FAFC",
                    borderColor: colors.border,
                  },
                  hintObj.uid === myUid && {
                    borderColor: colors.primary,
                    backgroundColor: colors.isDark ? "rgba(20,101,241,0.05)" : "#EFF6FF"
                  }
                ]}
              >
                <View style={[styles.avatarMini, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                  <Image
                    source={getAvatarByIndex(players.findIndex(p => p.uid === hintObj.uid))}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body2, { color: colors.textSecondary, fontSize: 12 }]}>{hintObj.name}</Text>
                  <Text style={[typography.h5, { color: colors.textPrimary, marginTop: 2 }]}>{hintObj.hint}</Text>
                </View>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.textSecondary} />
              </View>
            ))}
            {roundHints.length === 0 && (
              <Text style={[styles.emptyText, typography.body3, { color: colors.textDisabled, textAlign: "center", marginVertical: 20 }]}>
                No hints submitted yet.
              </Text>
            )}
          </ScrollView>

          {/* Hint submission form */}
          {isMyTurn && !roundHintsCompleted && (
            <View style={styles.inputForm}>
              <TextInput
                value={hintInput}
                onChangeText={setHintInput}
                placeholder="Enter single word hint..."
                placeholderTextColor={colors.textDisabled}
                autoCorrect={false}
                autoCapitalize="none"
                style={[
                  styles.textInput,
                  typography.body1,
                  {
                    backgroundColor: colors.isDark ? "#000000" : "#F8FAFC",
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }
                ]}
              />
              <TouchableOpacity onPress={handleHintSubmit} disabled={submitting} style={styles.fullWidthBtn}>
                <LinearGradient colors={colors.gradientBtn} style={styles.actionBtn}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFF" />
                      <Text style={[styles.btnText, typography.btn1]}>SUBMIT HINT</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Host actions once all hints are in */}
          {roundHintsCompleted && (
            <View style={styles.hostControlPanel}>
              {isHost ? (
                <View style={{ gap: 10, width: "100%" }}>
                  {currentRound < totalRounds ? (
                    <>
                      <TouchableOpacity onPress={() => handleProceedRound(false)} disabled={submitting} style={styles.fullWidthBtn}>
                        <LinearGradient colors={colors.gradientSuccess} style={styles.actionBtn}>
                          <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
                          <Text style={[styles.btnText, typography.btn1]}>START ROUND {currentRound + 1}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleProceedRound(true)} disabled={submitting} style={[styles.fullWidthBtn, styles.dangerBtn]}>
                        <View style={styles.actionBtnGhost}>
                          <Ionicons name="exit-outline" size={18} color={colors.error} />
                          <Text style={[styles.btnTextGhost, typography.btn1, { color: colors.error }]}>END GAME & VOTE NOW</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => handleProceedRound(false)} disabled={submitting} style={styles.fullWidthBtn}>
                      <LinearGradient colors={colors.gradientDanger} style={styles.actionBtn}>
                        <Ionicons name="flash" size={20} color="#FFF" />
                        <Text style={[styles.btnText, typography.btn1]}>PROCEED TO VOTING</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={[styles.readyPill, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight }]}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[typography.body2, { color: colors.primary }]}>
                    Waiting for the host to proceed...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Phase C: Voting Screen
  const renderVotingScreen = () => {
    const hasVoted = votes[myUid] !== undefined;

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.courseBadge, { backgroundColor: colors.gradientDanger[0] }]}>
              <Text style={[styles.courseBadgeText, typography.sub8, { color: "#FFF" }]}>VOTING TIME</Text>
            </View>
            <Text style={[typography.sub7, { color: colors.textSecondary }]}>WHO IS THE IMPOSTER?</Text>
          </View>

          {!hasVoted ? (
            <View style={{ width: "100%", flex: 1 }}>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginBottom: 20 }]}>
                Select the player you suspect of being the Imposter. You cannot select yourself.
              </Text>

              <ScrollView style={styles.candidatesScroll} contentContainerStyle={{ gap: 8 }}>
                {players.filter(p => p.uid !== myUid).map((player) => {
                  const selected = selectedVoteUid === player.uid;
                  return (
                    <TouchableOpacity
                      key={player.uid}
                      onPress={() => setSelectedVoteUid(player.uid)}
                      style={[
                        styles.candidateRow,
                        {
                          backgroundColor: colors.isDark ? "#0A0A0A" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                        selected && {
                          borderColor: colors.error,
                          backgroundColor: colors.isDark ? "rgba(211,47,47,0.08)" : "#FEF2F2"
                        }
                      ]}
                    >
                      <View style={[styles.avatarMini, { backgroundColor: selected ? "rgba(239,68,68,0.15)" : colors.primaryLight, overflow: "hidden" }]}>
                        <Image
                          source={getAvatarByIndex(players.findIndex(p => p.uid === player.uid))}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={[typography.body1, { flex: 1, color: colors.textPrimary, fontWeight: selected ? "bold" : "600" }]}>
                        {player.name}
                      </Text>
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={selected ? colors.error : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity onPress={handleVoteSubmit} disabled={submitting} style={styles.fullWidthBtn}>
                <LinearGradient colors={colors.gradientDanger} style={styles.actionBtn}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                      <Text style={[styles.btnText, typography.btn1]}>SUBMIT VOTE</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.votedWrap}>
              <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} style={{ marginBottom: 12 }} />
              <Text style={[typography.h5, { color: colors.textPrimary, textAlign: "center", marginBottom: 6 }]}>
                Vote Submitted!
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginBottom: 24 }]}>
                Suspect: {players.find(p => p.uid === votes[myUid])?.name || "Unknown"}
              </Text>

              {/* Progress details */}
              <View style={[styles.readyPill, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.1)" : "#ECFDF5", width: "100%" }]}>
                <ActivityIndicator size="small" color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[typography.body2, { color: colors.success }]}>
                  Waiting for voters ({Object.keys(votes).length} / {players.length})...
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Phase D: Results & Imposter Bonus Round Screen
  const renderResultsScreen = () => {
    // 1. Calculate votes count
    const votesArray = Object.values(votes);
    const voteCounts = {};
    players.forEach(p => {
      voteCounts[p.uid] = votesArray.filter(v => v === p.uid).length;
    });

    const sortedPlayersByVotes = [...players].sort((a, b) => (voteCounts[b.uid] || 0) - (voteCounts[a.uid] || 0));

    // Check if bonus round guess has been submitted
    const isBonusSubmitted = roomData.imposterGuess !== undefined;

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.courseBadge, { backgroundColor: colors.error }]}>
              <Text style={[styles.courseBadgeText, typography.sub8, { color: "#FFF" }]}>RESULTS REVEAL</Text>
            </View>
            <Text style={[typography.sub7, { color: colors.textSecondary }]}>WHO WAS CAUGHT?</Text>
          </View>

          {/* Imposter Reveal banner */}
          <View style={[styles.resultsBanner, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.12)" : "#FEF2F2", borderColor: colors.error }]}>
            <Text style={[typography.sub2, { color: colors.error, letterSpacing: 2, marginBottom: 6 }]}>THE IMPOSTER WAS</Text>
            <Text style={[typography.h2, { color: colors.error }]}>{imposterPlayer?.name}</Text>
          </View>

          {/* Topic Reveal banner */}
          {(!isImposter || isBonusSubmitted) ? (
            <View style={[styles.topicRevealBox, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.12)" : "#ECFDF5", borderColor: colors.success }]}>
              <Text style={[typography.sub2, { color: colors.success, letterSpacing: 2, marginBottom: 4 }]}>THE SECRET TOPIC WAS</Text>
              <Text style={[typography.h3, { color: colors.success }]}>{gameData.answer}</Text>
            </View>
          ) : (
            <View style={[styles.topicRevealBox, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.08)" : "#FFF5F5", borderColor: colors.error }]}>
              <Text style={[typography.sub2, { color: colors.error, letterSpacing: 2, marginBottom: 4 }]}>THE SECRET TOPIC IS</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4 }}>
                <Ionicons name="lock-closed" size={16} color={colors.error} />
                <Text style={[typography.h4, { color: colors.error, fontStyle: "italic" }]}>Hidden until you submit guess</Text>
              </View>
            </View>
          )}

          {/* Vote breakdown */}
          <Text style={[typography.sub3, { color: colors.textSecondary, alignSelf: "flex-start", marginBottom: 10, marginTop: 16 }]}>
            VOTE BREAKDOWN:
          </Text>
          <View style={styles.votesBreakdownList}>
            {sortedPlayersByVotes.map((player) => {
              const count = voteCounts[player.uid] || 0;
              const isActualImposter = player.uid === gameData.imposterId;
              return (
                <View key={player.uid} style={[styles.voteBreakdownRow, { borderBottomColor: colors.border }]}>
                  <Text style={[typography.body1, { color: colors.textPrimary, fontWeight: isActualImposter ? "bold" : "600" }]}>
                    {player.name} {isActualImposter && <Text style={{ color: colors.error }}>(Imposter)</Text>}
                  </Text>
                  <Text style={[typography.h5, { color: isActualImposter ? colors.error : colors.textSecondary }]}>
                    {count} vote{count !== 1 ? "s" : ""}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Imposter Bonus Round block */}
          <View style={[styles.bonusRoundCard, { backgroundColor: colors.isDark ? "#080808" : "#F8FAFC", borderColor: colors.border }]}>
            <Text style={[typography.sub2, { color: colors.primary, letterSpacing: 1.5, marginBottom: 8 }]}>
              🎯 IMPOSTER BONUS ROUND
            </Text>

            {isImposter ? (
              <View style={{ width: "100%" }}>
                <Text style={[typography.body2, { color: colors.textSecondary, marginBottom: 12 }]}>
                  You survived or got caught! You have a chance to steal <Text style={{ color: colors.success, fontWeight: "bold" }}>+{roomData?.bettingAmount || 50} bonus points</Text> by guessing the secret topic.
                </Text>
                <TextInput
                  value={bonusGuess}
                  onChangeText={setBonusGuess}
                  placeholder="Guess the secret topic..."
                  placeholderTextColor={colors.textDisabled}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={[
                    styles.textInput,
                    typography.body1,
                    {
                      backgroundColor: colors.isDark ? "#000000" : "#FFFFFF",
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      marginBottom: 10
                    }
                  ]}
                />
                <TouchableOpacity onPress={handleBonusSubmit} disabled={submitting} style={styles.fullWidthBtn}>
                  <LinearGradient colors={colors.gradientSuccess} style={styles.actionBtn}>
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="ribbon-outline" size={18} color="#FFF" />
                        <Text style={[styles.btnText, typography.btn1]}>SUBMIT GUESS</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: "100%", alignItems: "center", paddingVertical: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center" }]}>
                  Waiting for the imposter ({imposterPlayer?.name}) to guess the topic...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Phase E: Leaderboard Screen
  const renderLeaderboardScreen = () => {
    // Sort players by score
    const sortedLeaderboard = [...players].sort((a, b) => b.score - a.score);

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.courseBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.courseBadgeText, typography.sub8, { color: "#FFF" }]}>LEADERBOARD</Text>
            </View>
            <Text style={[typography.sub7, { color: colors.textSecondary }]}>STANDINGS</Text>
          </View>

          {/* Reveal details of the bonus round outcome */}
          {roomData.imposterGuess !== undefined && (
            <View style={[styles.bonusOutcomeBox, { backgroundColor: colors.isDark ? "#080808" : "#F8FAFC", borderColor: colors.border }]}>
              <Text style={[typography.sub2, { color: colors.textSecondary, fontSize: 10, letterSpacing: 1 }]}>
                BONUS ROUND GUESS BY {imposterPlayer?.name?.toUpperCase()}:
              </Text>
              <Text style={[typography.body1, { color: colors.textPrimary, marginVertical: 4, fontWeight: "bold" }]}>
                "{roomData.imposterGuess}"
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons
                  name={roomData.imposterGuessCorrect ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={roomData.imposterGuessCorrect ? colors.success : colors.error}
                />
                <Text style={[typography.sub7, { color: roomData.imposterGuessCorrect ? colors.success : colors.error }]}>
                  {roomData.imposterGuessCorrect ? `CORRECT GUESS (+${roomData.bettingAmount || 50} pts)` : "INCORRECT GUESS (0 pts)"}
                </Text>
              </View>
              {roomData.imposterSurvives ? (
                <Text style={[typography.sub7, { color: colors.success, marginTop: 4 }]}>
                  🎭 Imposter survived the votes!
                </Text>
              ) : (
                <Text style={[typography.sub7, { color: colors.error, marginTop: 4 }]}>
                  👮 Imposter was caught!
                </Text>
              )}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }}>
                <Text style={[typography.sub2, { color: colors.textSecondary, fontSize: 9, letterSpacing: 1 }]}>
                  THE SECRET TOPIC WAS:
                </Text>
                <Text style={[typography.body1, { color: colors.success, fontWeight: "bold", marginTop: 2 }]}>
                  {gameData.answer}
                </Text>
              </View>
            </View>
          )}

          {/* List of players sorted by score */}
          <ScrollView style={styles.leaderboardScroll} contentContainerStyle={{ gap: 8 }}>
            {sortedLeaderboard.map((player, idx) => {
              const isFirst = idx === 0;
              const isImposter = player.uid === gameData.imposterId;
              return (
                <View
                  key={player.uid}
                  style={[
                    styles.leaderboardRow,
                    {
                      backgroundColor: colors.isDark ? "#0A0A0A" : "#F8FAFC",
                      borderColor: colors.border,
                    },
                    isFirst && {
                      borderColor: colors.warning,
                      backgroundColor: colors.isDark ? "rgba(245,158,11,0.06)" : "#FEF3C7"
                    }
                  ]}
                >
                  <View style={styles.rankBadge}>
                    {isFirst ? (
                      <Ionicons name="trophy" size={18} color={colors.warning} />
                    ) : (
                      <Text style={[typography.h5, { color: colors.textSecondary }]}>{idx + 1}</Text>
                    )}
                  </View>

                  <Text style={[typography.body1, { flex: 1, color: colors.textPrimary, fontWeight: isFirst ? "bold" : "600" }]} numberOfLines={1}>
                    {player.name} {isImposter && <Text style={{ color: colors.error, fontSize: 10 }}>(Imposter)</Text>}
                  </Text>

                  <Text style={[typography.h4, { color: isFirst ? colors.warning : colors.primary }]}>
                    {player.score} pts
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Host controller for Play Again / Guest waiting view */}
          <View style={styles.hostControlPanel}>
            {isHost ? (
              <TouchableOpacity onPress={handlePlayAgain} disabled={submitting} style={styles.fullWidthBtn}>
                <LinearGradient colors={colors.gradientSuccess} style={styles.actionBtn}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color="#FFF" />
                      <Text style={[styles.btnText, typography.btn1]}>PLAY AGAIN</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.readyPill, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight }]}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[typography.body2, { color: colors.primary }]}>
                  Waiting for host to start a new round...
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "Home" }] })}
              style={[styles.fullWidthBtn, { marginTop: 10 }]}
            >
              <View style={[styles.actionBtnGhost, { borderColor: colors.border }]}>
                <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.btnTextGhost, typography.btn1, { color: colors.textSecondary }]}>LEAVE ROOM</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
            <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>
              ROOM: {roomCode}
            </Text>
            <TouchableOpacity onPress={handleQuit} style={[styles.quitBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {gameStatus === "reveal" && renderRevealScreen()}
            {gameStatus === "round" && renderRoundScreen()}
            {gameStatus === "voting" && renderVotingScreen()}
            {gameStatus === "results" && renderResultsScreen()}
            {gameStatus === "leaderboard" && renderLeaderboardScreen()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  centerBg: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  scroll: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  cardContainer: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardGreen: { shadowColor: "#10B981" },
  cardRed: { shadowColor: "#EF4444" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  courseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  courseBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarLargeText: { fontSize: 32, fontWeight: "900" },
  playerNameLarge: { fontSize: 26, fontWeight: "900", letterSpacing: 0.5, marginBottom: 8 },
  hiddenSub: { fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 28 },

  fullWidthBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginTop: 20 },
  dangerBtn: { marginTop: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnGhost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 14,
  },
  btnText: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  btnTextGhost: { fontSize: 14, fontWeight: "900", letterSpacing: 1 },

  // Role details styles
  playerNameSmall: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  roleWrap: { alignItems: "center", width: "100%" },
  roleIntro: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginBottom: 6 },
  roleTitleRed: { fontSize: 40, fontWeight: "900", letterSpacing: 4, marginBottom: 14 },
  clueIntro: { fontSize: 11, marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  clueList: { width: "100%", gap: 8, marginBottom: 20 },
  clueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  clueNumber: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  clueNumberText: { fontSize: 10, fontWeight: "900" },
  clueText: { fontSize: 13, fontWeight: "600", flex: 1 },
  topicBox: {
    borderWidth: 1,
    borderRadius: 16,
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  topicText: { fontSize: 30, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  topicHint: { fontSize: 12, textAlign: "center", lineHeight: 17, marginBottom: 20 },
  readyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },

  // Turn-based styles
  turnIndicator: {
    width: "100%",
    paddingVertical: 10,
    marginBottom: 16,
  },
  hintsScroll: {
    width: "100%",
    maxHeight: 220,
    marginBottom: 16,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMiniText: { fontSize: 14, fontWeight: "800" },
  avatarMiniTextFlagged: {},
  inputForm: { width: "100%" },
  textInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  emptyText: { fontSize: 12, marginVertical: 12 },
  hostControlPanel: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },

  // Voting styles
  candidatesScroll: {
    width: "100%",
    maxHeight: 240,
    marginBottom: 12,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  votedWrap: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },

  // Results styles
  resultsBanner: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  topicRevealBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  votesBreakdownList: {
    width: "100%",
    marginBottom: 16,
  },
  voteBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bonusRoundCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
  },

  // Leaderboard styles
  leaderboardScroll: {
    width: "100%",
    maxHeight: 240,
    marginBottom: 16,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  rankBadge: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusOutcomeBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    alignSelf: "center",
  },
  quitBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
});
