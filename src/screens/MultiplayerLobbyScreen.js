import React, { useState, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, TextInput,
  Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import { joinRoomAtomic } from "../services/roomService";

export default function MultiplayerLobbyScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef(null);
  const CODE_LENGTH = 6;
  const chars = roomCode.toUpperCase().split("");
  const codeChars = [...chars, ...Array(CODE_LENGTH).fill("")].slice(0, CODE_LENGTH);

  const handleJoinRoom = async () => {
    if (roomCode.length < CODE_LENGTH) {
      Alert.alert("Error", "Please enter a 6-character room code.");
      return;
    }
    setLoading(true);
    const code = roomCode.toUpperCase();
    const myUid = auth.currentUser?.uid || "guest";
    const emailPrefix = auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Guest";

    try {
      const roomMeta = await joinRoomAtomic(code, myUid, emailPrefix);

      // Route offline rooms to OfflineWaitingLobby
      if (roomMeta.gameMode === "Offline") {
        navigation.navigate("OfflineWaitingLobby", {
          roomCode: code,
          course: roomMeta.category,
          players: roomMeta.playersRequired,
          rounds: roomMeta.totalRounds,
          selectedTopic: roomMeta.selectedTopic,
          isHost: roomMeta.hostId === myUid,
          clueTimer: roomMeta.clueTimer,
        });
      } else {
        navigation.navigate("WaitingRoom", {
          roomCode: code,
          course: roomMeta.category,
          players: roomMeta.playersRequired,
          isHost: roomMeta.hostId === myUid,
          isDemoMode: false,
        });
      }
    } catch (e) {
      console.log(e);
      const msg = e.message || "";
      if (msg === "ROOM_NOT_FOUND") {
        Alert.alert("Error", "Room not found.");
      } else if (msg === "ROOM_FULL") {
        Alert.alert("Error", "Room is full.");
      } else if (msg.startsWith("INSUFFICIENT_COINS:")) {
        const cost = msg.split(":")[1];
        Alert.alert(
          "Insufficient Coins",
          `You need at least ${cost} coins to join this room. Claim your Daily Reward to get coins!`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Claim Reward", onPress: () => navigation.navigate("DailyReward") }
          ]
        );
      } else {
        Alert.alert("Error", `Failed to join room: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera Permission Required", "Please allow camera access to scan QR codes.");
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    const code = data.trim().toUpperCase().slice(0, 6);
    setRoomCode(code);
    setShowScanner(false);
    // Auto-join immediately
    handleJoinWithCode(code);
  };

  const handleJoinWithCode = async (code) => {
    if (!code || code.length < 6) return;
    setLoading(true);
    const myUid = auth.currentUser?.uid || "guest";
    const emailPrefix = auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Guest";
    try {
      const roomMeta = await joinRoomAtomic(code, myUid, emailPrefix);
      if (roomMeta.gameMode === "Offline") {
        navigation.navigate("OfflineWaitingLobby", {
          roomCode: code, course: roomMeta.category, players: roomMeta.playersRequired,
          rounds: roomMeta.totalRounds, selectedTopic: roomMeta.selectedTopic,
          isHost: roomMeta.hostId === myUid, clueTimer: roomMeta.clueTimer,
        });
      } else {
        navigation.navigate("WaitingRoom", {
          roomCode: code, course: roomMeta.category, players: roomMeta.playersRequired,
          isHost: roomMeta.hostId === myUid, isDemoMode: false,
        });
      }
    } catch (e) {
      const msg = e.message || "";
      if (msg === "ROOM_NOT_FOUND") Alert.alert("Error", "Room not found.");
      else if (msg === "ROOM_FULL") Alert.alert("Error", "Room is full.");
      else if (msg.startsWith("INSUFFICIENT_COINS:")) {
        const cost = msg.split(":")[1];
        Alert.alert(
          "Insufficient Coins",
          `You need at least ${cost} coins to join this room. Claim your Daily Reward to get coins!`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Claim Reward", onPress: () => navigation.navigate("DailyReward") }
          ]
        );
      } else Alert.alert("Error", `Failed to join room: ${e.message}`);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.header, { backgroundColor: "transparent", borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>MULTIPLAYER</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Create Room */}
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.panelHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.isDark ? "rgba(0,185,111,0.08)" : "#ECFDF5", borderColor: colors.isDark ? "rgba(0,185,111,0.3)" : "rgba(16,185,129,0.15)" }]}>
                  <Ionicons name="satellite-outline" size={22} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.panelTitle, typography.h6, { color: colors.textPrimary }]}>Create Room</Text>
                  <Text style={[styles.panelSub, typography.sub3, { color: colors.textSecondary }]}>Generate a code & invite friends</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("CreateRoom")} activeOpacity={0.85} style={styles.emeraldBtnWrap}>
                <LinearGradient colors={colors.gradientSuccess} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emeraldBtn}>
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                  <Text style={[styles.emeraldBtnText, typography.btn2]}>Create Room</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: "auto" }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divRow}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.divLabel, typography.sub2, { color: colors.textDisabled }]}>OR JOIN EXISTING</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Join Room */}
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.panelHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.08)" : "#EFF6FF", borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.15)" }]}>
                  <Ionicons name="key-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.panelTitle, typography.h6, { color: colors.textPrimary }]}>Join Room</Text>
                  <Text style={[styles.panelSub, typography.sub3, { color: colors.textSecondary }]}>Enter the 6-character access code</Text>
                </View>
              </View>

              <View style={styles.codeLabelRow}>
                <Text style={[styles.codeLabel, typography.sub2, { color: colors.primary }]}>ROOM CODE</Text>
                <TouchableOpacity onPress={handleOpenScanner} activeOpacity={0.8} style={[styles.qrScanBtn, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : "#EFF6FF", borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.2)" }]}>
                  <Ionicons name="qr-code-outline" size={14} color={colors.primary} />
                  <Text style={[typography.body3, { color: colors.primary, fontWeight: "700" }]}>Scan QR</Text>
                </TouchableOpacity>
              </View>
              {/* 6-block code input */}
              <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1} style={styles.codeWrapper}>
                {codeChars.map((char, i) => {
                  const filled = char !== "";
                  const cursor = i === roomCode.length;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.codeBlock,
                        {
                          backgroundColor: colors.isDark ? "#000000" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                        filled && {
                          backgroundColor: colors.isDark ? "rgba(20,101,241,0.1)" : "#EFF6FF",
                          borderColor: colors.primary,
                        },
                        cursor && {
                          borderColor: colors.primary,
                        }
                      ]}
                    >
                      <Text style={[styles.codeBlockChar, typography.h3, { color: colors.primary }]}>{char}</Text>
                      {cursor && <View style={[styles.codeCaret, { backgroundColor: colors.primary }]} />}
                    </View>
                  );
                })}
                <TextInput
                  ref={inputRef}
                  value={roomCode}
                  onChangeText={(v) => setRoomCode(v.toUpperCase().slice(0, CODE_LENGTH))}
                  onSubmitEditing={handleJoinRoom}
                  style={styles.hiddenInput}
                  maxLength={CODE_LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleJoinRoom}
                disabled={loading || roomCode.length < CODE_LENGTH}
                activeOpacity={0.85}
                style={[styles.violetBtnWrap, roomCode.length < CODE_LENGTH && { opacity: 0.45 }]}
              >
                <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.violetBtn}>
                  {loading
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <><Ionicons name="enter-outline" size={18} color="#FFF" /><Text style={[styles.violetBtnText, typography.btn2]}>Join Room</Text><Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: "auto" }} /></>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {roomCode.length > 0 && roomCode.length < CODE_LENGTH && (
                <Text style={[styles.codeHint, typography.body3, { color: colors.primary }]}>{CODE_LENGTH - roomCode.length} more character{CODE_LENGTH - roomCode.length !== 1 ? "s" : ""} needed</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerBg}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
              {/* Overlay */}
              <View style={styles.scanOverlay} pointerEvents="none">
                <Text style={styles.scanTitle}>SCAN QR CODE</Text>
                <View style={styles.scanGuide}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.scanHint}>Point camera at the host's QR code</Text>
              </View>
              {loading && (
                <View style={styles.scanLoading}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={{ color: "#FFF", marginTop: 12, fontWeight: "700", fontSize: 15 }}>Joining room…</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scanCloseBtn}>
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.permBox}>
              <Ionicons name="camera-outline" size={52} color="#94A3B8" />
              <Text style={{ color: "#64748B", textAlign: "center", marginVertical: 12, fontSize: 14 }}>
                Camera access needed to scan QR codes.
              </Text>
              <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
                <Text style={{ color: "#FFF", fontWeight: "700" }}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  scroll: { padding: 20 },

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22, borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden", marginBottom: 16, padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  panelTopLine: { marginBottom: 16 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  iconBoxEmerald: { backgroundColor: "#ECFDF5", borderColor: "rgba(16,185,129,0.15)" },
  iconBoxViolet: { backgroundColor: "#EFF6FF", borderColor: "rgba(37,99,235,0.15)" },
  panelTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A", letterSpacing: 0.4 },
  panelSub: { fontSize: 12, color: "#64748B", marginTop: 2 },

  emeraldBtnWrap: { borderRadius: 14, overflow: "hidden" },
  emeraldBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 18 },
  emeraldBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.8 },

  divRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  divLabel: { fontSize: 10, color: "#94A3B8", letterSpacing: 1.5, fontWeight: "700" },

  codeLabel: { fontSize: 10, fontWeight: "700", color: "#2563EB", letterSpacing: 1.5, marginBottom: 12 },
  codeWrapper: { flexDirection: "row", gap: 8, height: 58, marginBottom: 16, position: "relative" },
  codeBlock: {
    flex: 1, height: 58, borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  codeBlockFilled: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  codeBlockCursor: { borderColor: "#2563EB" },
  codeBlockChar: { color: "#2563EB", fontSize: 20, fontWeight: "900" },
  codeCaret: { width: 2, height: 20, backgroundColor: "#2563EB", position: "absolute" },
  hiddenInput: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0 },

  violetBtnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  violetBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 18 },
  violetBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.8 },

  codeHint: { textAlign: "center", fontSize: 11, color: "#2563EB", letterSpacing: 0.5 },
  codeLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  codeLabel: { fontSize: 10, fontWeight: "700", color: "#2563EB", letterSpacing: 1.5 },
  qrScanBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  // Scanner
  scannerBg: { flex: 1, backgroundColor: "#000" },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanTitle: { color: "#FFF", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginBottom: 30, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  scanGuide: { width: 230, height: 230, position: "relative" },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#FFFFFF" },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanHint: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 28, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  scanLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  scanCloseBtn: { position: "absolute", top: 56, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  permBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  permBtn: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
});
