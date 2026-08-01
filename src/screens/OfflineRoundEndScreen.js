import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { subscribeToRoom, updateRoom } from "../services/roomService";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

export default function OfflineRoundEndScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { course, players, topic, imposterIndex, roundNumber: initialRoundNumber, rounds, scores, roomCode, isHost, clueTimer } = route.params || {};

  const [dbRoom, setDbRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const playerList = Array.isArray(players) ? players : [];
  const totalRounds = rounds || 3;

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

  // Listen for transitions
  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data) return;
      setDbRoom(data);

      if (data.gameStatus === "offline_turn") {
        navigation.navigate("OfflineTurn", {
          course: data.category || course,
          players: playerList,
          topic: data.topic || topic,
          imposterIndex: data.imposterIndex ?? imposterIndex,
          turnOrder: data.turnOrder || [],
          roundNumber: data.currentRound || 1,
          rounds: data.totalRounds || totalRounds,
          roomCode,
          isHost,
          clueTimer: data.clueTimer !== undefined ? data.clueTimer : (clueTimer || 0),
        });
      } else if (data.gameStatus === "offline_voting") {
        navigation.navigate("OfflineVoting", {
          course: data.category || course,
          players: playerList,
          topic: data.topic || topic,
          imposterIndex: data.imposterIndex ?? imposterIndex,
          roomCode,
          isHost,
          scores: data.scores || {},
        });
      }
    });
    return unsub;
  }, [roomCode]);

  const roundNumber = dbRoom?.currentRound ?? initialRoundNumber ?? 1;
  const currentScores = dbRoom?.scores || scores || {};
  const roundsLeft = totalRounds - roundNumber;

  const handleNextRound = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Shuffle turn order for next round
      const shuffledPlayers = [...playerList];
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
      }
      const shuffledUids = shuffledPlayers.map(p => p.uid);
      await updateRoom(roomCode, {
        gameStatus: "offline_turn",
        currentRound: roundNumber + 1,
        currentTurnIndex: 0,
        turnOrder: shuffledUids,
        turnStartedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert("Error", `Failed to start next round: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await updateRoom(roomCode, {
        gameStatus: "offline_voting",
        votes: {}, // Clear any previous votes
      });
    } catch (e) {
      Alert.alert("Error", `Failed to start voting: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Scoreboard data
  const scoreboard = playerList.map((p) => ({
    ...p,
    totalScore: currentScores[p.uid] || 0,
  })).sort((a, b) => b.totalScore - a.totalScore);

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="flag-outline" size={18} color={colors.primary} />
            <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>ROUND END</Text>
          </View>
          <TouchableOpacity onPress={handleQuit} style={[styles.quitBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Banner */}
          <View style={[styles.bannerCard, {
            backgroundColor: colors.isDark ? "rgba(20,101,241,0.1)" : "#EFF6FF",
            borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.2)",
          }]}>
            <Ionicons name="checkmark-done-circle" size={54} color={colors.primary} style={{ marginBottom: 10 }} />
            <Text style={[typography.sub2, { color: colors.primary, marginBottom: 6 }]}>
              ROUND {roundNumber} OF {totalRounds} COMPLETE
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary, textAlign: "center", marginBottom: 8 }]}>
              All hints given!
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", lineHeight: 20 }]}>
              Discuss what you've heard.{"\n"}
              {roundsLeft > 0
                ? `${roundsLeft} round${roundsLeft !== 1 ? "s" : ""} remaining — host can start another round or trigger voting.`
                : "Final round done — host will launch voting."}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.primary }]}>{playerList.length}</Text>
              <Text style={[typography.sub2, { color: colors.textSecondary }]}>PLAYERS</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.warning }]}>{roundNumber}</Text>
              <Text style={[typography.sub2, { color: colors.textSecondary }]}>ROUND</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.success }]}>{roundsLeft}</Text>
              <Text style={[typography.sub2, { color: colors.textSecondary }]}>LEFT</Text>
            </View>
          </View>

          {/* Scoreboard */}
          {scoreboard.some((p) => p.totalScore > 0) && (
            <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.scoreHeader}>
                <Ionicons name="trophy-outline" size={16} color={colors.warning} />
                <Text style={[typography.sub2, { color: colors.textSecondary }]}>CURRENT SCORES</Text>
              </View>
              {scoreboard.map((p, idx) => (
                <View key={p.uid} style={[styles.scoreRow, idx < scoreboard.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Text style={[typography.h6, { color: colors.textDisabled, width: 24 }]}>#{idx + 1}</Text>
                  <View style={[styles.scoreAvatar, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                    <Image
                      source={getAvatarByIndex(playerList.findIndex(pl => pl.uid === p.uid))}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={[typography.body2, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[typography.h5, { color: p.totalScore > 0 ? colors.success : colors.textDisabled }]}>
                    {p.totalScore} pts
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          {isHost ? (
            <>
              {roundsLeft > 0 && (
                <TouchableOpacity onPress={handleNextRound} disabled={loading} activeOpacity={0.85} style={styles.btnWrap}>
                  <View style={[styles.btnGhost, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="refresh-circle-outline" size={22} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.btn1, { color: colors.primary }]}>NEXT ROUND</Text>
                      {/* <Text style={[typography.body3, { color: colors.textSecondary }]}>Round {roundNumber + 1} of {totalRounds}</Text> */}
                    </View>
                    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.primary} />}
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleVote} disabled={loading} activeOpacity={0.85} style={[styles.btnWrap, { marginTop: 10 }]}>
                <LinearGradient colors={colors.gradientDanger} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                  <Ionicons name="hand-left-outline" size={22} color="#FFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.btn1, { color: "#FFF" }]}>END GAME — VOTE NOW</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 }}>
                      {roundsLeft > 0 ? "Skip remaining rounds" : "All rounds done"}
                    </Text>
                  </View>
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.waitBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[typography.body2, { color: colors.textSecondary }]}>Waiting for host to pick next action…</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  bannerCard: { borderWidth: 1, borderRadius: 28, padding: 28, alignItems: "center", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: "center", gap: 4 },
  scoreCard: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 14 },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  scoreAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  btnWrap: { borderRadius: 18, overflow: "hidden" },
  btnGhost: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18 },
  btn: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 18 },
  waitBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 18, width: "100%" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", letterSpacing: 2.5 },
  quitBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
});
