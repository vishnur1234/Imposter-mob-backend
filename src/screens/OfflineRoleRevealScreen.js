import React, { useEffect, useState, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Animated, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { subscribeToRoom, updateRoom, arrayUnion } from "../services/roomService";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = 420;

export default function OfflineRoleRevealScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { course, players, topic, imposterIndex, rounds, roomCode, isHost, clueTimer } = route.params || {};

  const [dbRoom, setDbRoom] = useState(null);
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadingReady, setLoadingReady] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  const flipToBack = () => {
    Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsFlipped(true);
    setSeen(true);
  };

  const flipToFront = () => {
    Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsFlipped(false);
  };

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

  const myPlayerIndex = playerList.findIndex((p) => p.uid === currentUid);
  const isImposter = myPlayerIndex === imposterIndex;
  const myPlayer = playerList[myPlayerIndex] || { name: "You" };
  const clueList = topic?.clues ? topic.clues : (topic?.clue ? [topic.clue] : []);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data) return;
      setDbRoom(data);
      const rPlayers = data.readyPlayers || [];
      setReady(rPlayers.includes(currentUid));
      if (data.gameStatus === "offline_turn") {
        navigation.navigate("OfflineTurn", {
          course: data.category || course,
          players: playerList,
          topic: data.topic || topic,
          imposterIndex: data.imposterIndex ?? imposterIndex,
          turnOrder: data.turnOrder || [],
          roundNumber: data.roundNumber || 1,
          rounds: data.totalRounds || rounds || 3,
          roomCode,
          isHost,
          clueTimer: data.clueTimer !== undefined ? data.clueTimer : (clueTimer || 0),
        });
      }
    });
    return unsub;
  }, [roomCode]);

  useEffect(() => {
    if (!isHost || !dbRoom || !roomCode) return;
    const rPlayers = dbRoom.readyPlayers || [];
    const allPlayers = dbRoom.players || [];
    if (rPlayers.length >= allPlayers.length && dbRoom.gameStatus === "offline_reveal") {
      const startTurns = async () => {
        try {
          const shuffledUids = [...allPlayers].sort(() => Math.random() - 0.5).map(p => p.uid);
          await updateRoom(roomCode, {
            gameStatus: "offline_turn",
            turnOrder: shuffledUids,
            currentTurnIndex: 0,
            roundNumber: 1,
            turnStartedAt: Date.now(),
          });
        } catch (e) { console.log("Failed to start turn round automatically:", e.message); }
      };
      startTurns();
    }
  }, [dbRoom, isHost, roomCode]);

  const handleReady = async () => {
    if (ready || loadingReady) return;
    setLoadingReady(true);
    try {
      await updateRoom(roomCode, { readyPlayers: arrayUnion(currentUid) });
      setReady(true);
    } catch (e) {
      Alert.alert("Error", `Failed to set ready: ${e.message}`);
    } finally {
      setLoadingReady(false);
    }
  };

  const readyPlayersList = dbRoom?.readyPlayers || [];

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>ROLE REVEAL</Text>
          </View>
          <TouchableOpacity onPress={handleQuit} style={[styles.quitBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Instruction */}
          <Text style={[styles.instruction, typography.body2, { color: colors.textSecondary }]}>
            {seen ? "Hold to peek again. Release to hide." : "Hold the card below to reveal your secret role!"}
          </Text>

          {/* 3D Flip Card */}
          <View style={[styles.flipContainer, { height: CARD_HEIGHT, width: CARD_WIDTH }]}>

            {/* FRONT — Hidden face */}
            <Animated.View style={[
              styles.face,
              styles.faceFront,
              { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }], backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
              <LinearGradient
                colors={colors.isDark ? ["rgba(20,101,241,0.12)", "rgba(20,101,241,0.03)"] : ["#EFF6FF", "#F8FAFC"]}
                style={styles.faceGradient}
              >
                {/* Decorative pattern */}
                <View style={styles.patternGrid}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <View key={i} style={[styles.patternDot, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : "rgba(37,99,235,0.08)" }]} />
                  ))}
                </View>

                <View style={[styles.avatarLarge, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                  <Image
                    source={getAvatarByIndex(myPlayerIndex)}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: 6, textAlign: "center" }]}>
                  {myPlayer?.name}
                </Text>
                <View style={[styles.secretBadge, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.2)" : "#EFF6FF", borderColor: colors.primary + "40" }]}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.primary} />
                  <Text style={[typography.sub8, { color: colors.primary }]}>SECRET ROLE HIDDEN</Text>
                </View>
                <Text style={[typography.body3, { color: colors.textDisabled, marginTop: 20, textAlign: "center" }]}>
                  👋 Hold to peek • Release to hide
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* BACK — Revealed face */}
            <Animated.View style={[
              styles.face,
              styles.faceBack,
              {
                opacity: backOpacity,
                transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                backgroundColor: isImposter
                  ? (colors.isDark ? "#1a0000" : "#FEF2F2")
                  : (colors.isDark ? "#001a0d" : "#ECFDF5"),
                borderColor: isImposter ? colors.error : colors.success,
              }
            ]}>
              <LinearGradient
                colors={isImposter
                  ? (colors.isDark ? ["rgba(211,47,47,0.25)", "rgba(211,47,47,0.05)"] : ["#FEF2F2", "#FFF1F1"])
                  : (colors.isDark ? ["rgba(0,185,111,0.25)", "rgba(0,185,111,0.05)"] : ["#ECFDF5", "#F0FDF4"])
                }
                style={styles.faceGradient}
              >
                <View style={[styles.roleBadge, { backgroundColor: (isImposter ? colors.error : colors.success) + "22" }]}>
                  <Ionicons name={isImposter ? "alert-circle" : "checkmark-circle"} size={13} color={isImposter ? colors.error : colors.success} />
                  <Text style={[typography.sub8, { color: isImposter ? colors.error : colors.success, letterSpacing: 2 }]}>
                    {isImposter ? "IMPOSTER" : "PLAYER"}
                  </Text>
                </View>

                {isImposter ? (
                  <>
                    <Ionicons name="alert-circle" size={52} color={colors.error} style={{ marginBottom: 10 }} />
                    <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 4 }]}>YOU ARE THE</Text>
                    <Text style={[styles.roleTitle, { color: colors.error }]}>IMPOSTER</Text>
                    {clueList.length > 0 && (
                      <>
                        <Text style={[typography.body3, { color: colors.textSecondary, marginBottom: 8, textAlign: "center" }]}>
                          Guess the topic using {clueList.length > 1 ? "these clues" : "this clue"}:
                        </Text>
                        {clueList.map((clue, i) => (
                          <View key={i} style={[styles.clueItem, { backgroundColor: colors.isDark ? "#000" : "#FFF", borderColor: colors.isDark ? "rgba(211,47,47,0.25)" : "rgba(239,68,68,0.15)" }]}>
                            <View style={[styles.clueNum, { backgroundColor: colors.isDark ? "rgba(211,47,47,0.2)" : "#FEF2F2" }]}>
                              <Text style={[typography.btn2, { color: colors.error }]}>{String(i + 1).padStart(2, "0")}</Text>
                            </View>
                            <Text style={[typography.body2, { color: colors.textPrimary, flex: 1 }]}>{clue}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={52} color={colors.success} style={{ marginBottom: 10 }} />
                    <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 8 }]}>YOUR SECRET TOPIC IS</Text>
                    <LinearGradient
                      colors={colors.isDark ? ["rgba(0,185,111,0.3)", "rgba(0,185,111,0.08)"] : ["#DCFCE7", "#ECFDF5"]}
                      style={[styles.topicBox, { borderColor: colors.isDark ? "rgba(0,185,111,0.35)" : "rgba(16,185,129,0.3)" }]}
                    >
                      <Text style={[styles.topicAnswer, { color: colors.success }]}>{topic?.answer}</Text>
                    </LinearGradient>
                    <Text style={[typography.body3, { color: colors.textSecondary, textAlign: "center", marginTop: 8 }]}>
                      Say <Text style={{ fontWeight: "bold", color: colors.success }}>one word</Text> about it. Don't let the imposter guess!
                    </Text>
                  </>
                )}

                <Text style={[typography.body3, { color: colors.textDisabled, marginTop: 10 }]}>Release to hide</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Hold button */}
          <TouchableOpacity
            onPressIn={flipToBack}
            onPressOut={flipToFront}
            activeOpacity={1}
            style={[styles.holdBtn, { borderColor: isFlipped ? (isImposter ? colors.error : colors.success) : colors.primary }]}
          >
            <LinearGradient
              colors={isFlipped
                ? (isImposter ? ["#b91c1c", "#ef4444"] : ["#059669", "#10b981"])
                : colors.gradientBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.holdBtnInner}
            >
              <Ionicons name={isFlipped ? "eye" : "eye-outline"} size={20} color="#FFF" />
              <Text style={[typography.btn1, { color: "#FFF" }]}>
                {isFlipped ? "Peeking — Release to hide" : "Hold to Reveal"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Ready button */}
          {seen && (
            ready ? (
              <View style={[styles.readyBanner, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.15)" : "#ECFDF5", borderColor: colors.success }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={[typography.btn2, { color: colors.success }]}>Ready! Waiting for others…</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleReady} disabled={loadingReady} activeOpacity={0.85} style={styles.readyBtnWrap}>
                <View style={[styles.readyBtn, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.12)" : colors.primaryLight, borderColor: colors.border }]}>
                  {loadingReady
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <>
                      <Ionicons name="checkmark-done" size={18} color={colors.primary} />
                      <Text style={[typography.btn2, { color: colors.primary, flex: 1, textAlign: "center" }]}>I'm Ready</Text>
                    </>
                  }
                </View>
              </TouchableOpacity>
            )
          )}

          {/* Player status list */}
          <View style={[styles.readyListCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 12 }]}>
              PLAYER STATUS ({readyPlayersList.length}/{playerList.length})
            </Text>
            {playerList.map((p, i) => {
              const isPlayerReady = readyPlayersList.includes(p.uid);
              return (
                <View key={p.uid} style={styles.playerStatusRow}>
                  <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                    <Image
                      source={getAvatarByIndex(i)}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={[typography.body3, { color: colors.textPrimary, flex: 1 }]}>{p.name}</Text>
                  {isPlayerReady ? (
                    <View style={styles.statusBadgeReady}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={{ color: colors.success, fontSize: 10, fontWeight: "700" }}>READY</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeWaiting}>
                      <ActivityIndicator size="small" color={colors.textDisabled} style={{ transform: [{ scale: 0.7 }] }} />
                      <Text style={{ color: colors.textDisabled, fontSize: 10 }}>READING...</Text>
                    </View>
                  )}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, gap: 10 },
  headerTitle: {},
  scroll: { padding: 20, gap: 16, flexGrow: 1 },
  instruction: { textAlign: "center", lineHeight: 20 },

  // Flip card
  flipContainer: { alignSelf: "center" },
  face: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  faceFront: {},
  faceBack: {},
  faceGradient: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  // Front decorative pattern
  patternGrid: { position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", flexWrap: "wrap", gap: 18, opacity: 0.6 },
  patternDot: { width: 10, height: 10, borderRadius: 5 },

  avatarLarge: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  secretBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },

  // Back face
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  roleTitle: { fontSize: 40, fontWeight: "900", letterSpacing: 4, marginBottom: 14 },
  clueItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6, width: "100%" },
  clueNum: { width: 26, height: 26, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  topicBox: { borderWidth: 1.5, borderRadius: 16, width: "100%", paddingVertical: 20, paddingHorizontal: 16, alignItems: "center" },
  topicAnswer: { fontSize: 32, fontWeight: "900", textAlign: "center", letterSpacing: 1 },

  // Hold button
  holdBtn: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5 },
  holdBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },

  // Ready
  readyBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingVertical: 14 },
  readyBtnWrap: { borderRadius: 16, overflow: "hidden" },
  readyBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18 },

  // Status list
  readyListCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  playerStatusRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statusBadgeReady: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusBadgeWaiting: { flexDirection: "row", alignItems: "center", gap: 4 },
  quitBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
});
