import React, { useState, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Animated, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = 400;

export default function RoleRevealScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { roomCode, course, players, topic, imposterIndex, isHost, isDemoMode, gameId } = route.params || {};
  const playerList = Array.isArray(players) ? players : [];

  const gamePlayers = playerList.map((p, i) => ({
    id: p.uid || i,
    name: p.name || `Player ${i + 1}`,
    role: i === imposterIndex ? "IMPOSTER" : "PLAYER",
  }));

  const currentUid = auth.currentUser?.uid;
  const isSoloMode = isDemoMode || !gamePlayers.some((p) => p.id === currentUid);

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

  const myPlayer = isSoloMode ? null : (gamePlayers.find((p) => p.id === currentUid) || gamePlayers[0]);
  const isImposter = myPlayer?.role === "IMPOSTER";

  const [seen, setSeen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [soloIndex, setSoloIndex] = useState(0);

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

  const soloPlayer = gamePlayers[soloIndex];
  const soloIsImposter = soloPlayer?.role === "IMPOSTER";
  const activePlayer = isSoloMode ? soloPlayer : myPlayer;
  const activeIdx = gamePlayers.findIndex(gp => gp.id === activePlayer?.id);
  const activeIsImposter = isSoloMode ? soloIsImposter : isImposter;
  const clueList = topic?.clues ? topic.clues : (topic?.clue ? [topic.clue] : []);

  const goNext = () => {
    if (!seen) return;
    const nextParams = { roomCode, course, players: gamePlayers, topic, imposterIndex, isHost, isDemoMode, gameId };
    if (isSoloMode) {
      if (soloIndex < gamePlayers.length - 1) {
        setSoloIndex(soloIndex + 1);
        setSeen(false);
        setIsFlipped(false);
        flipAnim.setValue(0);
      } else {
        navigation.navigate("Discussion", nextParams);
      }
    } else {
      navigation.navigate("Discussion", nextParams);
    }
  };

  const isLastSolo = isSoloMode && soloIndex === gamePlayers.length - 1;

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

          {/* Progress dots for solo mode */}
          {isSoloMode && (
            <View style={styles.dotRow}>
              {gamePlayers.map((_, idx) => (
                <View key={idx} style={[
                  styles.dot,
                  { backgroundColor: colors.border },
                  idx < soloIndex && { backgroundColor: colors.primary + "60" },
                  idx === soloIndex && { backgroundColor: colors.primary, width: 18 },
                ]} />
              ))}
            </View>
          )}

          <Text style={[styles.instruction, typography.body2, { color: colors.textSecondary }]}>
            {seen
              ? "Hold to peek again. Release to hide."
              : isSoloMode
                ? `${activePlayer?.name} — hand the device, then hold to reveal!`
                : "Hold the card button below to flip & reveal your secret role!"}
          </Text>

          {/* 3D Flip Card */}
          <View style={[styles.flipContainer, { height: CARD_HEIGHT, width: CARD_WIDTH }]}>

            {/* FRONT — Hidden face */}
            <Animated.View style={[
              styles.face,
              {
                opacity: frontOpacity,
                transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }
            ]}>
              <LinearGradient
                colors={colors.isDark ? ["rgba(20,101,241,0.12)", "rgba(20,101,241,0.03)"] : ["#EFF6FF", "#F8FAFC"]}
                style={styles.faceGradient}
              >
                {/* Dot pattern */}
                <View style={styles.patternGrid}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <View key={i} style={[styles.patternDot, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.18)" : "rgba(37,99,235,0.08)" }]} />
                  ))}
                </View>

                {/* Course badge */}
                <View style={[styles.courseBadge, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.2)" : "#EFF6FF", borderColor: colors.primary + "40" }]}>
                  <Ionicons name="school-outline" size={11} color={colors.primary} />
                  <Text style={[typography.sub8, { color: colors.primary }]}>{course}</Text>
                </View>

                <View style={[styles.avatarLarge, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                  <Image
                    source={getAvatarByIndex(activeIdx)}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: 8, textAlign: "center" }]}>
                  {activePlayer?.name}
                </Text>
                <View style={[styles.secretBadge, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : "#EFF6FF", borderColor: colors.primary + "30" }]}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.primary} />
                  <Text style={[typography.sub8, { color: colors.primary }]}>SECRET ROLE HIDDEN</Text>
                </View>
                <Text style={[typography.body3, { color: colors.textDisabled, marginTop: 20 }]}>
                  👆 Hold button below to flip
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* BACK — Revealed face */}
            <Animated.View style={[
              styles.face,
              {
                opacity: backOpacity,
                transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                backgroundColor: activeIsImposter
                  ? (colors.isDark ? "#1a0000" : "#FEF2F2")
                  : (colors.isDark ? "#001a0d" : "#ECFDF5"),
                borderColor: activeIsImposter ? colors.error : colors.success,
              }
            ]}>
              <LinearGradient
                colors={activeIsImposter
                  ? (colors.isDark ? ["rgba(211,47,47,0.3)", "rgba(211,47,47,0.06)"] : ["#FEF2F2", "#FFF1F1"])
                  : (colors.isDark ? ["rgba(0,185,111,0.3)", "rgba(0,185,111,0.06)"] : ["#ECFDF5", "#F0FDF4"])
                }
                style={styles.faceGradient}
              >
                <View style={[styles.roleBadge, { backgroundColor: (activeIsImposter ? colors.error : colors.success) + "22" }]}>
                  <Ionicons name={activeIsImposter ? "alert-circle" : "checkmark-circle"} size={13} color={activeIsImposter ? colors.error : colors.success} />
                  <Text style={[typography.sub8, { color: activeIsImposter ? colors.error : colors.success, letterSpacing: 2 }]}>
                    {activeIsImposter ? "IMPOSTER" : "PLAYER"}
                  </Text>
                </View>

                {activeIsImposter ? (
                  <>
                    <Ionicons name="alert-circle" size={50} color={colors.error} style={{ marginBottom: 8 }} />
                    <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 4 }]}>YOU ARE THE</Text>
                    <Text style={[styles.roleTitle, { color: colors.error }]}>IMPOSTER</Text>
                    {clueList.length > 0 && (
                      <>
                        <Text style={[typography.body3, { color: colors.textSecondary, marginBottom: 6, textAlign: "center" }]}>
                          {clueList.length > 1 ? "Guess the topic — your clues:" : "Guess the topic — your clue:"}
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
                    <Ionicons name="checkmark-circle" size={50} color={colors.success} style={{ marginBottom: 8 }} />
                    <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 8 }]}>YOUR SECRET TOPIC IS</Text>
                    <LinearGradient
                      colors={colors.isDark ? ["rgba(0,185,111,0.3)", "rgba(0,185,111,0.08)"] : ["#DCFCE7", "#ECFDF5"]}
                      style={[styles.topicBox, { borderColor: colors.isDark ? "rgba(0,185,111,0.35)" : "rgba(16,185,129,0.3)" }]}
                    >
                      <Text style={[styles.topicAnswer, { color: colors.success }]}>{topic?.answer}</Text>
                    </LinearGradient>
                    <Text style={[typography.body3, { color: colors.textSecondary, textAlign: "center", marginTop: 8 }]}>
                      Say <Text style={{ fontWeight: "bold", color: colors.success }}>one word</Text> about it.
                    </Text>
                  </>
                )}

                <Text style={[typography.body3, { color: colors.textDisabled, marginTop: 10 }]}>Release to flip back</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Hold button */}
          <TouchableOpacity
            onPressIn={flipToBack}
            onPressOut={flipToFront}
            activeOpacity={1}
            style={[styles.holdBtn, { borderColor: isFlipped ? (activeIsImposter ? colors.error : colors.success) : colors.primary }]}
          >
            <LinearGradient
              colors={isFlipped
                ? (activeIsImposter ? ["#b91c1c", "#ef4444"] : ["#059669", "#10b981"])
                : colors.gradientBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.holdBtnInner}
            >
              <Ionicons name={isFlipped ? "eye" : "eye-outline"} size={20} color="#FFF" />
              <Text style={[typography.btn1, { color: "#FFF" }]}>
                {isFlipped ? "Peeking — Release to flip back" : "Hold to Reveal"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Next button — shows after first peek */}
          {seen && (
            <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={styles.nextBtnWrap}>
              {isSoloMode ? (
                <View style={[styles.nextBtnGhost, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.12)" : colors.primaryLight, borderColor: colors.border }]}>
                  <Ionicons name={isLastSolo ? "people" : "phone-portrait-outline"} size={18} color={colors.primary} />
                  <Text style={[styles.nextBtnGhostText, typography.btn2, { color: colors.primary }]}>
                    {isLastSolo ? "Start Discussion" : "Hide & Pass Device"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              ) : (
                <LinearGradient colors={colors.gradientSuccess} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextBtn}>
                  <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                  <Text style={[styles.nextBtnText, typography.btn1]}>Proceed to Discussion</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 15, fontWeight: "900", letterSpacing: 2.5 },
  scroll: { padding: 20, gap: 16, flexGrow: 1 },

  dotRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  instruction: { textAlign: "center", lineHeight: 20 },

  // 3D Flip
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
  faceGradient: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  patternGrid: { position: "absolute", top: 20, left: 20, right: 20, flexDirection: "row", flexWrap: "wrap", gap: 16, opacity: 0.7 },
  patternDot: { width: 9, height: 9, borderRadius: 5 },

  courseBadge: {
    flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1,
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 18,
  },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  secretBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },

  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 },
  roleTitle: { fontSize: 40, fontWeight: "900", letterSpacing: 4, marginBottom: 12 },
  clueItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6, width: "100%" },
  clueNum: { width: 26, height: 26, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  topicBox: { borderWidth: 1.5, borderRadius: 16, width: "100%", paddingVertical: 18, paddingHorizontal: 16, alignItems: "center" },
  topicAnswer: { fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: 1 },

  // Hold button
  holdBtn: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5 },
  holdBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },

  // Next
  nextBtnWrap: { borderRadius: 16, overflow: "hidden" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800", letterSpacing: 0.8 },
  nextBtnGhost: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
  },
  nextBtnGhostText: { flex: 1, fontSize: 14, fontWeight: "700" },

  quitBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
});
