import React, { useState } from "react";
import { View, StyleSheet, Text, Alert, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import { joinRoomAtomic } from "../services/roomService";

export default function JoinRoomScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("code"); // "code" | "qr"
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleJoin = async (codeOverride) => {
    const code = (codeOverride || roomCode).trim().toUpperCase();
    if (!code) {
      Alert.alert("Error", "Please enter a room code.");
      return;
    }

    setLoading(true);
    const myUid = auth.currentUser?.uid || "guest";
    const emailPrefix = auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Guest Player";

    try {
      const roomMeta = await joinRoomAtomic(code, myUid, emailPrefix);

      navigation.navigate("WaitingRoom", {
        roomCode: code,
        course: roomMeta.category,
        players: roomMeta.playersRequired,
        isHost: roomMeta.hostId === myUid,
        isDemoMode: false,
      });
    } catch (error) {
      console.log(error);
      const msg = error.message || "";
      if (msg === "ROOM_NOT_FOUND") {
        Alert.alert("Error", "Room not found. Check the code.");
      } else if (msg === "ROOM_FULL") {
        Alert.alert("Error", "This room is full.");
      } else if (msg.startsWith("INSUFFICIENT_COINS:")) {
        const cost = msg.split(":")[1];
        Alert.alert("Insufficient Coins", `You need at least ${cost} coins to join this room. Claim your Daily Reward or play again later.`);
      } else {
        Alert.alert("Error", `Failed to join room: ${error.message}`);
      }
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    const code = data.trim().toUpperCase();
    setRoomCode(code);
    setTab("code");
    handleJoin(code);
  };

  const handleSwitchToQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera Permission Required", "Please allow camera access to scan QR codes.");
        return;
      }
    }
    setScanned(false);
    setTab("qr");
  };

  return (
    <LinearGradient colors={colors.gradientBg} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: "transparent", borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
            <Text style={[styles.backBtnText, typography.btn2, { color: colors.textSecondary }]}>← BACK</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>JOIN LOBBY</Text>
          <View style={{ width: 56 }} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.isDark ? "#121212" : "#F8FAFC", borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, tab === "code" && { backgroundColor: colors.surface, borderColor: colors.primary }, { borderColor: "transparent" }]}
            onPress={() => setTab("code")}
            activeOpacity={0.8}
          >
            <Ionicons name="keypad-outline" size={15} color={tab === "code" ? colors.primary : colors.textSecondary} />
            <Text style={[typography.btn2, { color: tab === "code" ? colors.primary : colors.textSecondary }]}>Enter Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "qr" && { backgroundColor: colors.surface, borderColor: colors.primary }, { borderColor: "transparent" }]}
            onPress={handleSwitchToQR}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={15} color={tab === "qr" ? colors.primary : colors.textSecondary} />
            <Text style={[typography.btn2, { color: tab === "qr" ? colors.primary : colors.textSecondary }]}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {tab === "code" ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, typography.sub2, { color: colors.primary }]}>ENTER CODE</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={roomCode}
                  onChangeText={setRoomCode}
                  placeholder="e.g. X94B2E"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleJoin()}
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
              </View>

              <TouchableOpacity
                onPress={() => handleJoin()}
                disabled={loading}
                style={[styles.btnContainer, loading && styles.btnDisabled]}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={colors.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGradient}
                >
                  <View style={styles.btnContent}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.btnLabel, typography.btn1]}>Join Room</Text>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Switch to QR hint */}
              <TouchableOpacity onPress={handleSwitchToQR} activeOpacity={0.7} style={styles.qrHint}>
                <Ionicons name="qr-code-outline" size={14} color={colors.primary} />
                <Text style={[typography.body3, { color: colors.primary }]}>Or scan a QR code instead</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.scannerContainer}>
            {permission?.granted ? (
              <>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />
                {/* Overlay with guide frame */}
                <View style={styles.scanOverlay} pointerEvents="none">
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
                    <Text style={{ color: "#FFF", marginTop: 10, fontWeight: "700" }}>Joining room…</Text>
                  </View>
                )}
                {scanned && !loading && (
                  <View style={styles.rescanRow}>
                    <TouchableOpacity onPress={() => setScanned(false)} style={[styles.rescanBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                      <Text style={[typography.btn2, { color: colors.primary }]}>Tap to scan again</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={48} color={colors.textDisabled} />
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginVertical: 12 }]}>
                  Camera access is needed to scan QR codes.
                </Text>
                <TouchableOpacity onPress={requestPermission} style={[styles.btnContainer, { width: "auto", paddingHorizontal: 24 }]} activeOpacity={0.85}>
                  <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
                    <Text style={[styles.btnLabel, typography.btn1]}>Allow Camera</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backBtnText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", letterSpacing: 2 },

  // Tabs
  tabRow: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Code input
  scrollContent: { padding: 20, justifyContent: "center", flexGrow: 1 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontSize: 10, fontWeight: "700", color: "#2563EB", letterSpacing: 1.5, marginBottom: 12 },
  inputContainer: { width: "100%", marginBottom: 20 },
  textInput: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#0F172A",
    fontSize: 15,
    letterSpacing: 4,
    textAlign: "center",
    fontWeight: "700",
  },
  btnContainer: { width: "100%", borderRadius: 16, overflow: "hidden" },
  btnGradient: { paddingVertical: 16, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnLabel: { color: "#F0F0FF", fontSize: 14, fontWeight: "bold", letterSpacing: 1.2, textTransform: "uppercase" },
  btnDisabled: { opacity: 0.5 },
  qrHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },

  // QR Scanner
  scannerContainer: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanGuide: {
    width: 220,
    height: 220,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#FFFFFF",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanHint: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 24,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  rescanRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  // Permission screen
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 4,
  },
});
