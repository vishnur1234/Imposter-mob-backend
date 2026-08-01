import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { subscribeToRoom, updateRoom } from "../services/roomService";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

export default function OfflineTurnScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { course, players, topic, imposterIndex, turnOrder: initialTurnOrder, roundNumber: initialRoundNumber, rounds, roomCode, isHost, clueTimer } = route.params || {};

  const [dbRoom, setDbRoom] = useState(null);
  const [passing, setPassing] = useState(false);

  const limit = dbRoom?.clueTimer !== undefined ? dbRoom.clueTimer : (clueTimer || 0);
  const [secRemaining, setSecRemaining] = useState(limit > 0 ? limit : 0);

  const playerList = Array.isArray(players) ? players : [];
  const currentUid = auth.currentUser?.uid;

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

  // Listen for active turns and screen transition
  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data) return;
      setDbRoom(data);

      if (data.gameStatus === "offline_round_end") {
        navigation.navigate("OfflineRoundEnd", {
          course: data.category || course,
          players: playerList,
          topic: data.topic || topic,
          imposterIndex: data.imposterIndex ?? imposterIndex,
          roundNumber: data.currentRound || 1,
          rounds: data.totalRounds || rounds,
          roomCode,
          isHost,
          scores: data.scores || {},
          clueTimer: data.clueTimer !== undefined ? data.clueTimer : (clueTimer || 0),
        });
      }
    });
    return unsub;
  }, [roomCode]);

  const turnOrder = dbRoom?.turnOrder || initialTurnOrder || [];
  const turnIndex = dbRoom?.currentTurnIndex ?? 0;
  const roundNumber = dbRoom?.currentRound ?? initialRoundNumber ?? 1;

  // Identify active player
  const activePlayerUid = turnOrder[turnIndex];
  const activePlayer = playerList.find((p) => p.uid === activePlayerUid) || playerList[0] || { name: "Player" };
  const activeIdx = playerList.findIndex((p) => p.uid === activePlayer?.uid);
  const isMyTurn = currentUid === activePlayerUid;
  const isLast = turnIndex >= turnOrder.length - 1;
  const progress = ((turnIndex + 1) / turnOrder.length) * 100;

  const handlePass = async () => {
    if (passing) return;
    setPassing(true);
    try {
      if (isLast) {
        // Round ends
        await updateRoom(roomCode, {
          gameStatus: "offline_round_end",
        });
      } else {
        // Move to next player
        await updateRoom(roomCode, {
          currentTurnIndex: turnIndex + 1,
          turnStartedAt: Date.now(),
        });
      }
    } catch (e) {
      console.log("Failed to pass turn:", e.message);
    } finally {
      setPassing(false);
    }
  };

  const handleForcePass = async () => {
    if (passing) return;
    try {
      if (isLast) {
        await updateRoom(roomCode, {
          gameStatus: "offline_round_end",
        });
      } else {
        await updateRoom(roomCode, {
          currentTurnIndex: turnIndex + 1,
          turnStartedAt: Date.now(),
        });
      }
    } catch (e) {
      console.log("Failed to force pass turn:", e.message);
    }
  };

  // Clue Turn Timer Ticker
  useEffect(() => {
    if (!dbRoom || dbRoom.gameStatus !== "offline_turn") return;

    const limit = dbRoom.clueTimer !== undefined ? dbRoom.clueTimer : (clueTimer || 0);
    if (limit <= 0) {
      setSecRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - (dbRoom.turnStartedAt || now)) / 1000);
      const rem = Math.max(0, limit - elapsed);
      setSecRemaining(rem);

      if (rem === 0) {
        if (isMyTurn) {
          handlePass();
        } else if (isHost && elapsed >= limit + 3) {
          handleForcePass();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dbRoom?.turnStartedAt, turnIndex, dbRoom?.gameStatus, isMyTurn]);

  const renderClueTimer = () => {
    if (limit <= 0) return null;
    return (
      <View style={[
        styles.timerPill,
        {
          backgroundColor: secRemaining <= 10 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
          borderColor: secRemaining <= 10 ? colors.error : colors.success,
          marginBottom: 20,
        }
      ]}>
        <Ionicons name="time" size={14} color={secRemaining <= 10 ? colors.error : colors.success} />
        <Text style={[typography.body3, { color: secRemaining <= 10 ? colors.error : colors.success, fontWeight: "bold" }]}>
          Time Left: {secRemaining}s
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="mic-outline" size={18} color={colors.primary} />
            <Text style={[typography.sub2, { color: colors.textPrimary }]}>ROUND {roundNumber} — HINTS</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={[typography.body3, { color: colors.textSecondary }]}>{turnIndex + 1}/{turnOrder.length}</Text>
            <TouchableOpacity onPress={handleQuit} style={[styles.quitBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? "#1a1a1a" : "#E2E8F0" }]}>
            <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {/* Current player card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isMyTurn ? (
              <>
                <View style={[styles.turnBadge, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight, borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.15)" }]}>
                  <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primary} />
                  <Text style={[typography.sub2, { color: colors.primary }]}>IT'S YOUR TURN</Text>
                </View>

                {renderClueTimer()}

                <View style={[styles.avatar, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                  <Image
                    source={getAvatarByIndex(activeIdx)}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[typography.h3, { color: colors.textPrimary, textAlign: "center", marginBottom: 6 }]}>{activePlayer?.name}</Text>
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginBottom: 32, lineHeight: 20 }]}>
                  Say <Text style={{ color: colors.primary, fontWeight: "bold" }}>one word</Text> about the topic to the group.{"\n"}Don't let the imposter guess it!
                </Text>

                <TouchableOpacity onPress={handlePass} disabled={passing} activeOpacity={0.85} style={styles.passWrap}>
                  <LinearGradient colors={isLast ? colors.gradientSuccess : colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passBtn}>
                    {passing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name={isLast ? "checkmark-done-outline" : "hand-right-outline"} size={22} color="#FFF" />
                        <Text style={[typography.btn1, { color: "#FFF" }]}>{isLast ? "FINISH ROUND" : "PASS"}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.turnBadge, { backgroundColor: colors.isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7", borderColor: colors.isDark ? "rgba(245,158,11,0.3)" : "#FDE68A" }]}>
                  <Ionicons name="time-outline" size={14} color={colors.warning} />
                  <Text style={[typography.sub2, { color: colors.warning }]}>WAITING FOR {activePlayer?.name?.toUpperCase()}</Text>
                </View>

                {renderClueTimer()}

                <View style={[styles.avatar, { backgroundColor: colors.isDark ? "#2a2a2a" : "#F1F5F9", overflow: "hidden" }]}>
                  <Image
                    source={getAvatarByIndex(activeIdx)}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[typography.h3, { color: colors.textPrimary, textAlign: "center", marginBottom: 6 }]}>{activePlayer?.name}</Text>
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginBottom: 32, lineHeight: 20 }]}>
                  They are giving their hint to the circle right now. Listen carefully!
                </Text>

                <View style={[styles.passBtnDisabled, { borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.textDisabled} style={{ marginRight: 8 }} />
                  <Text style={[typography.btn1, { color: colors.textDisabled }]}>THEIR TURN...</Text>
                </View>
              </>
            )}
          </View>

          {/* Queue preview */}
          <View style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 12 }]}>TURN ORDER</Text>
            {turnOrder.map((uid, idx) => {
              const p = playerList.find((pl) => pl.uid === uid) || { name: "Player" };
              const isCurrent = idx === turnIndex;
              const isCompleted = idx < turnIndex;
              return (
                <View key={uid} style={[styles.queueRow, idx < turnOrder.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={[styles.queueNum, {
                    backgroundColor: isCompleted ? (colors.isDark ? "rgba(0,185,111,0.15)" : "#ECFDF5") : isCurrent ? colors.primaryLight : "transparent",
                    borderColor: isCurrent ? colors.primary : "transparent"
                  }]}>
                    {isCompleted
                      ? <Ionicons name="checkmark" size={14} color={colors.success} />
                      : <Text style={[typography.btn2, { color: isCurrent ? colors.primary : colors.textDisabled }]}>{idx + 1}</Text>
                    }
                  </View>
                  <Text style={[typography.body2, { color: isCurrent ? colors.textPrimary : isCompleted ? colors.textDisabled : colors.textSecondary, flex: 1 }]}>
                    {p.name}
                  </Text>
                  {isCurrent && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 20, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 16 },
  turnBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  passWrap: { width: "100%", borderRadius: 18, overflow: "hidden" },
  passBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18 },
  passBtnDisabled: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 18, paddingVertical: 18, width: "100%" },
  queueCard: { borderWidth: 1, borderRadius: 20, padding: 18 },
  queueRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  queueNum: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "center",
  },
  quitBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
});
