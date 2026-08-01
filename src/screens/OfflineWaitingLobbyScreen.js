import React, { useEffect, useRef, useState } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, SafeAreaView,
  Animated, Alert, ActivityIndicator, Clipboard, Modal, Image,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { getUserStatsById } from "../services/statsService";
import { subscribeToRoom, updateRoom } from "../services/roomService";
import { generateTopic } from "../services/generateTopic";
import { useTheme } from "../context/ThemeContext";
import { getAvatarByIndex } from "../services/avatarService";

const AVATAR_COLORS = [
  "#F59E0B", "#10B981", "#3B82F6", "#EC4899",
  "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
];

function circlePositions(count, radius) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    return { x: radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) };
  });
}

export default function OfflineWaitingLobbyScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { roomCode, course, players: maxPlayers, rounds, selectedTopic, isHost, clueTimer } = route.params || {};
  const [joinedPlayers, setJoinedPlayers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [dbRoom, setDbRoom] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, async (data) => {
      if (!data) { Alert.alert("Room Closed", "The room was closed."); navigation.navigate("Home"); return; }
      setDbRoom(data);
      const playersList = data.players || [];
      const enriched = await Promise.all(
        playersList.map(async (p) => {
          try {
            const sd = await getUserStatsById(p.uid);
            const gTag = sd.playerName || sd.name;
            if (gTag) return { ...p, name: gTag };
          } catch (_) { }
          return p;
        })
      );
      setJoinedPlayers(enriched);
      if (data.gameStatus === "offline_reveal") {
        navigation.navigate("OfflineRoleReveal", {
          course: data.category || course,
          players: enriched,
          topic: data.topic,
          imposterIndex: data.imposterIndex ?? 0,
          rounds: data.totalRounds || rounds,
          scores: {},
          roomCode,
          isHost,
          clueTimer: data.clueTimer !== undefined ? data.clueTimer : (clueTimer || 0),
        });
      }
    });
    return unsub;
  }, [roomCode]);

  const handleStart = async () => {
    if (joinedPlayers.length < 3) { Alert.alert("Not Enough Players", "You need at least 3 players to start."); return; }
    setStarting(true);
    try {
      let topic = selectedTopic;
      if (!topic) { topic = await generateTopic(course); }
      else if (topic.id && typeof topic.id === "string" && topic.id.startsWith("random_")) {
        topic = await generateTopic(topic.category || topic.id.replace("random_", ""));
      }
      const imposterIndex = Math.floor(Math.random() * joinedPlayers.length);
      await updateRoom(roomCode, { gameStatus: "offline_reveal", topic, imposterIndex, startedAt: Date.now() });
    } catch (e) { Alert.alert("Error", `Failed to start: ${e.message}`); }
    finally { setStarting(false); }
  };

  const handleCopyCode = () => {
    Clipboard.setString(roomCode || "");
    Alert.alert("Copied!", `Room code "${roomCode}" copied to clipboard.`);
  };

  const CIRCLE_RADIUS = 105;
  const positions = circlePositions(Math.max(joinedPlayers.length, 1), CIRCLE_RADIUS);
  const canStart = isHost && joinedPlayers.length >= 3;

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>OFFLINE LOBBY</Text>
          <View style={[styles.modeBadge, { backgroundColor: colors.isDark ? "rgba(251,191,36,0.15)" : "#FFFBEB", borderColor: colors.isDark ? "rgba(251,191,36,0.3)" : "#FDE68A" }]}>
            <Ionicons name="phone-portrait-outline" size={11} color={colors.warning} />
            <Text style={{ color: colors.warning, fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>OFFLINE</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Room Code Card */}
          <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.sub2, { color: colors.textSecondary, marginBottom: 8, letterSpacing: 1.5 }]}>ROOM CODE — SHARE WITH PLAYERS</Text>
            <View style={styles.codeRow}>
              {(roomCode || "------").split("").map((ch, i) => (
                <View key={i} style={[styles.codeBlock, { backgroundColor: colors.isDark ? "#000" : "#FFFBEB", borderColor: colors.isDark ? "rgba(251,191,36,0.4)" : "#FDE68A" }]}>
                  <Text style={[styles.codeChar, { color: colors.warning }]}>{ch}</Text>
                </View>
              ))}
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                <Text style={[typography.body3, { color: colors.textSecondary }]}>Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowQR(true)} activeOpacity={0.7} style={[styles.qrBtn, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : "#EFF6FF", borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.2)" }]}>
                <Ionicons name="qr-code-outline" size={13} color={colors.primary} />
                <Text style={[typography.body3, { color: colors.primary, fontWeight: "700" }]}>Show QR</Text>
              </TouchableOpacity>
            </View>
            <Text style={[typography.body3, { color: colors.textSecondary, textAlign: "center", marginTop: 2, lineHeight: 18 }]}>
              Other players join via <Text style={{ color: colors.primary, fontWeight: "700" }}>Multiplayer → Join Room</Text>
            </Text>
          </View>

          {/* Circle Section */}
          <View style={[styles.circleSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.circleHeader}>
              <Text style={[typography.sub2, { color: colors.textSecondary }]}>PLAYERS IN LOBBY</Text>
              <View style={[styles.countBadge, {
                backgroundColor: canStart ? (colors.isDark ? "rgba(0,185,111,0.15)" : "#ECFDF5") : (colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight),
                borderColor: canStart ? colors.success : colors.primary,
              }]}>
                <Text style={[typography.btn2, { color: canStart ? colors.success : colors.primary }]}>{joinedPlayers.length} / {maxPlayers}</Text>
              </View>
            </View>

            <View style={{ alignSelf: "center", width: CIRCLE_RADIUS * 2 + 48, height: CIRCLE_RADIUS * 2 + 48, position: "relative", alignItems: "center", justifyContent: "center" }}>
              {/* Orbit ring */}
              <View style={{ position: "absolute", width: CIRCLE_RADIUS * 2, height: CIRCLE_RADIUS * 2, borderRadius: CIRCLE_RADIUS, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.isDark ? "rgba(255,255,255,0.07)" : "rgba(37,99,235,0.09)" }} />
              {/* Center */}
              <View style={styles.circleCenter}>
                {joinedPlayers.length === 0 ? (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons name="people-outline" size={26} color={colors.textDisabled} />
                    <Text style={[typography.body3, { color: colors.textDisabled, textAlign: "center", marginTop: 4 }]}>Waiting…</Text>
                  </Animated.View>
                ) : (
                  <>
                    <Text style={[typography.h4, { color: colors.textPrimary }]}>{joinedPlayers.length}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}>JOINED</Text>
                  </>
                )}
              </View>
              {/* Avatars */}
              {joinedPlayers.map((p, i) => {
                const pos = positions[i] || { x: 0, y: 0 };
                const ac = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const isMe = p.uid === auth.currentUser?.uid;
                return (
                  <View key={p.uid} style={[styles.avatar, { left: pos.x - 4, top: pos.y - 4, backgroundColor: ac + "22", borderColor: isMe ? colors.primary : ac, borderWidth: isMe ? 2.5 : 1.5, overflow: "hidden" }]}>
                    <Image
                      source={getAvatarByIndex(i)}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    {isMe && <View style={[styles.meBadge, { backgroundColor: colors.primary }]}><Text style={{ color: "#FFF", fontSize: 6, fontWeight: "900" }}>ME</Text></View>}
                  </View>
                );
              })}
            </View>

            {joinedPlayers.length > 0 && (
              <View style={styles.nameList}>
                {joinedPlayers.map((p, i) => (
                  <View key={p.uid} style={[styles.nameChip, { backgroundColor: colors.isDark ? "#1a1a1a" : "#F8FAFC", borderColor: colors.border }]}>
                    <View style={[styles.nameChipDot, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]} />
                    <Text style={[typography.body3, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                    {p.uid === auth.currentUser?.uid && <Text style={{ color: colors.primary, fontSize: 9, fontWeight: "700" }}> (You)</Text>}
                    {i === 0 && <View style={[styles.hostTag, { backgroundColor: colors.warning + "22" }]}><Text style={{ color: colors.warning, fontSize: 8, fontWeight: "900" }}>HOST</Text></View>}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Betting amount info row */}
          <View style={[styles.waitBanner, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 4, paddingVertical: 12, justifyContent: "space-between", marginBottom: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
              <Text style={[typography.body2, { color: colors.textSecondary }]}>Betting Amount</Text>
            </View>
            <Text style={[typography.sub7, { color: colors.success }]}>
              {dbRoom?.bettingAmount || route.params?.bettingAmount || 50} coins
            </Text>
          </View>

          {/* Start / Waiting */}
          {isHost ? (
            <TouchableOpacity
              onPress={handleStart}
              disabled={!canStart || starting}
              activeOpacity={0.92}
              style={[
                styles.startBtnWrap,
                {
                  borderWidth: 1,
                  borderColor: canStart ? colors.playBtnBorder : colors.textDisabled,
                  borderRadius: 12,
                  overflow: "hidden"
                },
                (!canStart || starting) && { opacity: 0.5 }
              ]}
            >
              <LinearGradient
                colors={canStart ? colors.gradientPlayBtn : [colors.textDisabled, colors.textDisabled]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startBtn}
              >
                {starting ? (
                  <ActivityIndicator size="small" color={colors.playBtnText} />
                ) : (
                  <>
                    <Ionicons name="play-circle-outline" size={22} color={colors.playBtnText} />
                    <Text style={[styles.startBtnText, typography.btnPlay, { color: colors.playBtnText }]}>
                      {canStart ? "START GAME" : `Need ${3 - joinedPlayers.length} more player(s)`}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.waitBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[typography.body2, { color: colors.textSecondary }]}>Waiting for host to start…</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* QR Code Modal */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <TouchableOpacity style={styles.qrOverlay} activeOpacity={1} onPress={() => setShowQR(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.qrModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.qrModalHeader}>
              <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
              <Text style={[typography.sub2, { color: colors.textPrimary }]}>SCAN TO JOIN</Text>
            </View>
            <Text style={[typography.body3, { color: colors.textSecondary, textAlign: "center", marginBottom: 20 }]}>
              Open <Text style={{ fontWeight: "700", color: colors.primary }}>Multiplayer → Join Room → Scan QR</Text>
            </Text>
            <View style={[styles.qrFrame, { borderColor: colors.primary + "40", backgroundColor: "#fff" }]}>
              <QRCode
                value={roomCode || "ROOM"}
                size={180}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <View style={styles.qrCodeRow}>
              {(roomCode || "------").split("").map((ch, i) => (
                <View key={i} style={[styles.qrCodeBlock, { backgroundColor: colors.isDark ? "#000" : "#FFFBEB", borderColor: colors.isDark ? "rgba(251,191,36,0.4)" : "#FDE68A" }]}>
                  <Text style={[styles.codeChar, { color: colors.warning }]}>{ch}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowQR(false)} style={[styles.qrCloseBtn, { backgroundColor: colors.isDark ? "#1E293B" : "#F1F5F9", borderColor: colors.border }]}>
              <Text style={[typography.btn2, { color: colors.textSecondary }]}>CLOSE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 2.5 },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  body: { flex: 1, padding: 14, gap: 12 },
  codeCard: { borderWidth: 1, borderRadius: 22, padding: 18, alignItems: "center" },
  codeRow: { flexDirection: "row", gap: 7, marginBottom: 8 },
  codeBlock: { width: 38, height: 46, borderRadius: 10, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  codeChar: { fontSize: 20, fontWeight: "900" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  circleSection: { borderWidth: 1, borderRadius: 24, padding: 16, flex: 1 },
  circleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  countBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  circleCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  avatar: { position: "absolute", width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "800" },
  meBadge: { position: "absolute", bottom: -2, right: -2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5 },
  nameList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" },
  nameChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  nameChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  hostTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  startBtnWrap: { borderRadius: 12, overflow: "hidden" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  startBtnText: { textAlign: "center", marginBottom: 0 },
  waitBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 18 },
  codeActions: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  qrBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  qrModal: { width: "100%", borderRadius: 28, borderWidth: 1, padding: 24, alignItems: "center" },
  qrModalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  qrFrame: { borderWidth: 2, borderRadius: 16, padding: 14, marginBottom: 20 },
  qrCodeRow: { flexDirection: "row", gap: 7, marginBottom: 20 },
  qrCodeBlock: { width: 34, height: 42, borderRadius: 8, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  qrCloseBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
});
