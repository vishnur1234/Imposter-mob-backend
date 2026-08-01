import React, { useState, useEffect } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { subscribeToRoom, updateRoom } from "../services/roomService";
import { generateTopic } from "../services/generateTopic";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

export default function DiscussionScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { roomCode, course, players, topic, imposterIndex, isHost, isDemoMode, gameId } = route.params || {};
  const gamePlayers = Array.isArray(players) ? players : [];
  const initialGameId = gameId || null;
  const imposterPlayer = gamePlayers.find((p) => p.role === "IMPOSTER");

  const [showWinner, setShowWinner] = useState(false);
  const [suspects, setSuspects] = useState({});
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setSuspects((p) => ({ ...p, [id]: !p[id] }));

  useEffect(() => {
    if (isDemoMode || !roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (data && data.started && data.gameId && data.gameId !== initialGameId) {
        navigation.navigate("RoleReveal", {
          roomCode, course: data.course || course,
          players: Array.isArray(data.playerList) ? data.playerList : [],
          topic: data.topic, imposterIndex: data.imposterIndex ?? 0,
          isHost, isDemoMode: false, gameId: data.gameId,
        });
      }
    });
    return unsub;
  }, [roomCode, isDemoMode, initialGameId]);

  const handleRestart = async () => {
    setLoading(true);
    try {
      const newTopic = await generateTopic(course);
      let newImposter = Math.floor(Math.random() * gamePlayers.length);
      if (gamePlayers.length > 1) {
        const pool = [...Array(gamePlayers.length).keys()].filter(idx => idx !== imposterIndex);
        newImposter = pool[Math.floor(Math.random() * pool.length)];
      }
      const nextId = Math.random().toString(36).substring(2, 8).toUpperCase();
      if (isDemoMode || !roomCode) {
        navigation.navigate("RoleReveal", {
          roomCode, course, players: gamePlayers, topic: newTopic,
          imposterIndex: newImposter, isHost: true, isDemoMode: !!isDemoMode, gameId: nextId,
        });
      } else {
        await updateRoom(roomCode, { topic: newTopic, imposterIndex: newImposter, gameId: nextId });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to generate new topic.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <Ionicons name="search-outline" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>DISCUSSION</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Top info */}
            <View style={styles.introRow}>
              <View style={[styles.introIconWrap, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                <Ionicons name="people" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.introTitle, typography.h5, { color: colors.primary }]}>Suspect Board</Text>
                <Text style={[styles.introSub, typography.body2, { color: colors.textSecondary }]}>Each player gives <Text style={{ color: colors.textPrimary, fontWeight: "bold" }}>one word</Text>. Tap players to flag suspects.</Text>
              </View>
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              {gamePlayers.map((p, i) => {
                const flagged = !!suspects[p.id];
                return (
                  <TouchableOpacity
                    key={p.id} onPress={() => toggle(p.id)} activeOpacity={0.8}
                    style={[styles.gridBtn, { backgroundColor: colors.surface, borderColor: colors.border }, flagged && { backgroundColor: colors.isDark ? "rgba(211,47,47,0.12)" : "#FEE2E2", borderColor: colors.error }]}
                  >
                    <View style={[styles.gridAvatar, { backgroundColor: colors.primaryLight, overflow: "hidden" }, flagged && { backgroundColor: colors.isDark ? "rgba(211,47,47,0.15)" : "rgba(239,68,68,0.15)" }]}>
                      <Image
                        source={getAvatarByIndex(i)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={[styles.gridName, typography.body2, { color: colors.textPrimary }, flagged && { color: colors.error, fontWeight: "700" }]} numberOfLines={1}>{p.name}</Text>
                    {flagged && <Ionicons name="flag" size={12} color={colors.error} style={{ marginTop: 2 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reveal or Winner */}
            {!showWinner ? (
              <TouchableOpacity onPress={() => setShowWinner(true)} activeOpacity={0.85} style={styles.revealBtnWrap}>
                <LinearGradient colors={colors.gradientDanger} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.revealBtn}>
                  <Ionicons name="flash" size={20} color="#FFF" />
                  <Text style={[styles.revealBtnText, typography.btn1]}>Reveal the Imposter</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.winnerWrap}>
                <View style={[styles.winnerCard, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.12)" : "#FEF2F2", borderColor: colors.isDark ? "rgba(211,47,47,0.2)" : "rgba(239,68,68,0.2)" }]}>
                  <Text style={[styles.winnerLabel, typography.sub2, { color: colors.error }]}>THE IMPOSTER WAS</Text>
                  <View style={styles.winnerAvatarRow}>
                    <View style={[styles.winnerAvatar, { backgroundColor: colors.isDark ? "#000000" : "#FEF2F2", borderColor: colors.error, overflow: "hidden" }]}>
                      <Image
                        source={getAvatarByIndex(gamePlayers.findIndex(gp => gp.id === imposterPlayer?.id))}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={[styles.winnerName, typography.h3, { color: colors.error }]}>{imposterPlayer?.name}</Text>
                  </View>
                </View>

                <View style={[styles.topicReveal, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.12)" : "#ECFDF5", borderColor: colors.isDark ? "rgba(0,185,111,0.2)" : "rgba(16,185,129,0.2)" }]}>
                  <Ionicons name="bulb-outline" size={14} color={colors.success} />
                  <Text style={[styles.topicRevealLabel, typography.sub2, { color: colors.success }]}>THE SECRET TOPIC WAS</Text>
                  <Text style={[styles.topicRevealAnswer, typography.h2, { color: colors.success }]}>{topic?.answer}</Text>
                </View>

                {/* Action buttons */}
                <View style={styles.btnRow}>
                  {(isHost || !roomCode) ? (
                    <TouchableOpacity onPress={handleRestart} disabled={loading} activeOpacity={0.85} style={styles.playAgainWrap}>
                      <LinearGradient colors={colors.gradientBtn} style={styles.playAgainBtn}>
                        {loading
                          ? <ActivityIndicator size="small" color="#FFF" />
                          : <><Ionicons name="refresh-outline" size={18} color="#FFF" /><Text style={[styles.playAgainText, typography.btn1]}>Play Again</Text></>
                        }
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.waitBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.waitBtnText, typography.body2, { color: colors.textDisabled }]}>Waiting for host…</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={() => navigation.navigate("Home")} activeOpacity={0.85} style={[styles.homeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.homeBtnText, typography.btn2, { color: colors.textSecondary }]}>Home</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 18, borderBottomWidth: 1, borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", letterSpacing: 2.5 },
  scroll: { padding: 20, flexGrow: 1, justifyContent: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 24, padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },

  introRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  introIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "rgba(37,99,235,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  introTitle: { fontSize: 19, fontWeight: "800", color: "#2563EB", marginBottom: 4 },
  introSub: { fontSize: 12, color: "#64748B", lineHeight: 17 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    rowGap: 12,
  },
  gridBtn: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  gridBtnFlagged: { backgroundColor: "#FEE2E2", borderColor: "rgba(239,68,68,0.25)" },
  gridAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 6,
  },
  gridAvatarFlagged: { backgroundColor: "rgba(239,68,68,0.15)" },
  gridAvatarText: { color: "#2563EB", fontSize: 15, fontWeight: "800" },
  gridAvatarTextFlagged: { color: "#EF4444" },
  gridName: { color: "#374151", fontSize: 12, fontWeight: "600", textAlign: "center" },
  gridNameFlagged: { color: "#DC2626", fontWeight: "700" },

  revealBtnWrap: { borderRadius: 16, overflow: "hidden" },
  revealBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 17 },
  revealBtnText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1 },

  winnerWrap: { gap: 14 },
  winnerCard: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    borderRadius: 18, padding: 20, alignItems: "center",
  },
  winnerLabel: { fontSize: 10, fontWeight: "700", color: "#991B1B", letterSpacing: 2, marginBottom: 14 },
  winnerAvatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  winnerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#FEF2F2", borderWidth: 2, borderColor: "#EF4444",
    justifyContent: "center", alignItems: "center",
  },
  winnerAvatarText: { color: "#EF4444", fontSize: 20, fontWeight: "900" },
  winnerName: { fontSize: 26, fontWeight: "900", color: "#EF4444", letterSpacing: 1 },

  topicReveal: {
    alignItems: "center", backgroundColor: "#ECFDF5",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, gap: 6,
  },
  topicRevealLabel: { fontSize: 10, fontWeight: "700", color: "#065F46", letterSpacing: 2 },
  topicRevealAnswer: { fontSize: 26, fontWeight: "900", color: "#059669", letterSpacing: 1, textAlign: "center" },

  btnRow: { flexDirection: "row", gap: 10 },
  playAgainWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  playAgainBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  playAgainText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  waitBtn: {
    flex: 1, backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 14, justifyContent: "center", alignItems: "center", padding: 12,
  },
  waitBtnText: { color: "#94A3B8", fontSize: 12, textAlign: "center" },

  homeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 14, paddingVertical: 15,
  },
  homeBtnText: { color: "#475569", fontSize: 14, fontWeight: "700" },
});
