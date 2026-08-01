import React, { useEffect, useState } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Modal, Image,
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

export default function WaitingRoomScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const { roomCode, course, players, isHost, isDemoMode, selectedTopic: initialSelectedTopic } = route.params || {};
  const [joinedPlayers, setJoinedPlayers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(initialSelectedTopic || null);
  const [roomData, setRoomData] = useState(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setJoinedPlayers([
        { uid: auth.currentUser?.uid || "demo-0", name: auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Demo Host" },
      ]);
      return;
    }
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, async (data) => {
      if (!data) {
        Alert.alert("Error", "Room was disbanded.");
        navigation.navigate("Home");
        return;
      }

      setRoomData(data);
      const playersList = data.players || data.playerList || [];

      // Enrich each player's name from user_stats so gaming tags always show
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
      if (data.selectedTopic !== undefined) {
        setSelectedTopic(data.selectedTopic);
      }
      if (data.gameStatus === "reveal" || data.gameStatus === "round" || (data.started && data.topic)) {
        navigation.navigate("GamePlay", {
          roomCode,
          course: data.category || data.course || course,
          isHost,
          isDemoMode: false,
        });
      }
    });
    return unsub;
  }, [roomCode, isDemoMode]);

  const handleStart = async () => {
    if (joinedPlayers.length < 2 && !isDemoMode) {
      Alert.alert("Error", "Need at least 2 players to start a multiplayer Imposter Game.");
      return;
    }
    setStarting(true);
    try {
      let topic = selectedTopic;
      if (!topic) {
        topic = await generateTopic(course);
      } else if (topic.id && typeof topic.id === "string" && topic.id.startsWith("random_")) {
        const category = topic.category || topic.id.replace("random_", "");
        topic = await generateTopic(category);
      }

      if (!topic || !topic.answer) {
        throw new Error("Failed to generate a valid topic.");
      }

      const imposterPlayer = joinedPlayers[Math.floor(Math.random() * joinedPlayers.length)];
      if (!imposterPlayer) {
        throw new Error("No players joined.");
      }

      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();

      if (isDemoMode) {
        const imposterIndex = joinedPlayers.findIndex(p => p.uid === imposterPlayer.uid);
        navigation.navigate("RoleReveal", {
          roomCode,
          course,
          players: joinedPlayers,
          topic,
          imposterIndex: imposterIndex >= 0 ? imposterIndex : 0,
          isHost: true,
          isDemoMode: true,
          gameId
        });
      } else {
        // Resolve each player's gaming name from user_stats so it always shows correctly
        const enrichedPlayers = await Promise.all(
          joinedPlayers.map(async (p) => {
            try {
              const data = await getUserStatsById(p.uid);
              const gamingName = data.playerName || data.name;
              if (gamingName) return { ...p, name: gamingName };
            } catch (_) { }
            return p;
          })
        );

        await updateRoom(roomCode, {
          started: true,
          gameStatus: "reveal",
          readyPlayers: [],
          votes: {},
          hints: [],
          currentRound: 1,
          players: enrichedPlayers,
          gameData: {
            answer: topic.answer,
            clue: topic.clue || "",
            imposterId: imposterPlayer.uid
          },
          topic, // compatibility
          imposterIndex: enrichedPlayers.findIndex(p => p.uid === imposterPlayer.uid), // compatibility
          gameId
        });
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>WAITING ROOM</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Room code display */}
            <View style={styles.roomCodeBlock}>
              <Text style={[styles.roomCodeLabel, typography.sub2, { color: colors.primary }]}>ROOM CODE</Text>
              <Text style={[styles.roomCodeText, typography.h2, { fontSize: 36, letterSpacing: 3, color: colors.textPrimary }]}>{roomCode}</Text>
              <View style={[styles.livePill, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.15)" : "#ECFDF5", borderColor: colors.isDark ? "rgba(0,185,111,0.2)" : "rgba(16,185,129,0.2)" }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, typography.sub8, { color: colors.success }]}>LIVE</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(true)} activeOpacity={0.8} style={[styles.qrBtn, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : "#EFF6FF", borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.2)", marginTop: 12 }]}>
                <Ionicons name="qr-code-outline" size={14} color={colors.primary} />
                <Text style={[typography.btn2, { color: colors.primary }]}>Show QR Code</Text>
              </TouchableOpacity>
            </View>

            {/* Room Code Share Warning / Info Banner */}
            <View style={[styles.shareBanner, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.1)" : "#EFF6FF", borderColor: colors.isDark ? "rgba(20,101,241,0.25)" : "rgba(37,99,235,0.15)" }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.shareBannerText, typography.body3, { color: colors.primary }]}>
                Share this room code with your friends to join your waiting team!
              </Text>
            </View>

            {isDemoMode && (
              <View style={[styles.demoBanner, { backgroundColor: colors.isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7", borderColor: "rgba(245,158,11,0.25)" }]}>
                <Ionicons name="warning-outline" size={14} color={colors.warning} />
                <Text style={[styles.demoText, typography.sub7, { color: colors.warning }]}>Running in Local Demo Mode</Text>
              </View>
            )}

            {/* Player roster */}
            <View style={[styles.rosterCard, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}>
              <View style={styles.rosterHeader}>
                <View style={styles.rosterTitleRow}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.rosterTitle, typography.sub4, { color: colors.textSecondary }]}>PLAYERS JOINED</Text>
                </View>
                <Text style={[styles.rosterCount, typography.sub1, { color: colors.textSecondary }, joinedPlayers.length >= Number(players) && { color: colors.success }]}>
                  {joinedPlayers.length} / {players || 3}
                </Text>
              </View>
              {joinedPlayers.map((p, i) => (
                <View key={p.uid || i} style={[styles.playerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.playerAvatar, { backgroundColor: colors.primaryLight, overflow: "hidden" }]}>
                    <Image
                      source={getAvatarByIndex(i)}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={[styles.playerName, typography.body2, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                  <View style={[styles.playerOnline, { backgroundColor: colors.success }]} />
                </View>
              ))}
              {joinedPlayers.length === 0 && (
                <Text style={[styles.emptyText, typography.body3, { color: colors.textDisabled }]}>Waiting for players to join…</Text>
              )}
            </View>

            {/* Course info row */}
            <View style={[styles.infoRow, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}>
              <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, typography.body2, { color: colors.textSecondary }]}>Course</Text>
              <Text style={[styles.infoValue, typography.sub7, { color: colors.primary }]}>{course}</Text>
            </View>

            {/* Betting amount info row */}
            <View style={[styles.infoRow, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border, marginTop: 8 }]}>
              <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, typography.body2, { color: colors.textSecondary }]}>Betting Amount</Text>
              <Text style={[styles.infoValue, typography.sub7, { color: colors.success }]}>
                {roomData?.bettingAmount || route.params?.bettingAmount || 50} coins
              </Text>
            </View>

            {/* Actions */}
            {isHost ? (
              <TouchableOpacity
                onPress={handleStart}
                disabled={starting || joinedPlayers.length < 2}
                activeOpacity={0.92}
                style={[
                  styles.startBtnWrap,
                  {
                    borderWidth: 1,
                    borderColor: colors.playBtnBorder,
                    borderRadius: 12,
                    overflow: "hidden"
                  },
                  (starting || joinedPlayers.length < 2) && { opacity: 0.45 }
                ]}
              >
                <LinearGradient
                  colors={colors.gradientPlayBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startBtn}
                >
                  {starting ? (
                    <><ActivityIndicator size="small" color={colors.playBtnText} /><Text style={[styles.startBtnText, typography.btnPlay, { color: colors.playBtnText }]}>STARTING…</Text></>
                  ) : (
                    <><Ionicons name="rocket-outline" size={20} color={colors.playBtnText} /><Text style={[styles.startBtnText, typography.btnPlay, { color: colors.playBtnText }]}>START GAME</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.waitingRow, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight, borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.15)" }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.waitingText, typography.body2, { color: colors.primary }]}>Waiting for host to start the game…</Text>
              </View>
            )}
          </View>
        </ScrollView>
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
            <Text style={[typography.h3, { color: colors.textPrimary, letterSpacing: 4, marginBottom: 20 }]}>{roomCode}</Text>
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
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1, borderColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
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

  roomCodeBlock: { alignItems: "center", marginBottom: 20 },
  roomCodeLabel: { fontSize: 10, fontWeight: "700", color: "#2563EB", letterSpacing: 2.5, marginBottom: 6 },
  roomCodeText: { fontSize: 36, fontWeight: "900", color: "#0F172A", letterSpacing: 3 },
  livePill: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10,
    backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#10B981" },
  liveText: { fontSize: 11, fontWeight: "700", color: "#10B981", letterSpacing: 1.5 },

  demoBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center",
    backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    borderRadius: 12, paddingVertical: 8, marginBottom: 20,
  },
  demoText: { color: "#D97706", fontSize: 12, fontWeight: "700" },

  rosterCard: {
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 18, padding: 16, marginBottom: 16,
  },
  rosterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  rosterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rosterTitle: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 2 },
  rosterCount: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  rosterCountFull: { color: "#10B981" },

  playerRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8, gap: 10,
  },
  playerAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center",
  },
  playerAvatarText: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  playerName: { flex: 1, color: "#1E293B", fontSize: 13, fontWeight: "600" },
  playerOnline: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#10B981" },
  emptyText: { textAlign: "center", color: "#94A3B8", fontSize: 12, paddingVertical: 10 },

  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 20,
  },
  infoLabel: { flex: 1, color: "#64748B", fontSize: 12 },
  infoValue: { color: "#2563EB", fontSize: 12, fontWeight: "700", letterSpacing: 1 },

  startBtnWrap: { borderRadius: 12, overflow: "hidden" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  startBtnText: { textAlign: "center", marginBottom: 0 },

  waitingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 14, padding: 14,
  },
  waitingText: { color: "#2563EB", fontSize: 12 },
  shareBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  shareBannerText: {
    flex: 1,
    fontWeight: "700",
    lineHeight: 18,
    fontSize: 12,
  },
  qrBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  qrModal: { width: "100%", borderRadius: 28, borderWidth: 1, padding: 24, alignItems: "center" },
  qrModalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  qrFrame: { borderWidth: 2, borderRadius: 16, padding: 14, marginBottom: 20 },
  qrCloseBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
});
