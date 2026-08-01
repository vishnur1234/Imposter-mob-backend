import React, { useState, useEffect } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Modal, FlatList, TextInput,
} from "react-native";
import topics from "../data/demoData";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { getMyStats } from "../services/statsService";
import { useTheme } from "../context/ThemeContext";
import { createRoomAtomic } from "../services/roomService";

export default function CreateRoomScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [gameMode, setGameMode] = useState("Offline"); // "Multiplayer" | "Offline"
  const [showModeModal, setShowModeModal] = useState(false);
  const [players, setPlayers] = useState(3);
  const [rounds, setRounds] = useState(4);
  const [clueTimer, setClueTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicModalTab, setTopicModalTab] = useState("categories"); // "categories" | "topics"
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [userCoins, setUserCoins] = useState(0);
  const [hostPlayerName, setHostPlayerName] = useState("");

  const [bettingAmount, setBettingAmount] = useState(50);
  const [customBettingAmount, setCustomBettingAmount] = useState("");
  const [isCustomBetting, setIsCustomBetting] = useState(false);

  useEffect(() => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    getMyStats()
      .then((data) => {
        setUserCoins(data.highScore || 0);
        setHostPlayerName(data.playerName || (auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Host"));
      })
      .catch(() => setHostPlayerName(auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Host"));
  }, []);



  const handleCreate = async () => {
    const finalBettingAmount = isCustomBetting ? Number(customBettingAmount) : bettingAmount;
    if (isNaN(finalBettingAmount) || finalBettingAmount <= 0) {
      Alert.alert("Invalid Betting Amount", "Please enter a valid betting amount greater than 0.");
      return;
    }
    if (userCoins < finalBettingAmount) {
      Alert.alert("Insufficient Coins", `You need at least ${finalBettingAmount} coins to create this room. You currently have ${userCoins} coins.`);
      return;
    }
    setLoading(true);
    const emailPrefix = auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Host";
    const courseCategory = selectedTopic ? selectedTopic.category : "ACCA";
    const finalTopic = selectedTopic || { id: "random_acca", category: "ACCA", answer: "ACCA (Finance)" };
    try {
      const roomData = {
        hostId: auth.currentUser.uid,
        category: courseCategory,
        playersRequired: Number(players),
        totalRounds: Number(rounds),
        clueTimer: Number(clueTimer),
        currentRound: 1,
        gameStatus: "waiting",
        gameMode,
        createdAt: Date.now(),
        players: [{ uid: auth.currentUser.uid, name: hostPlayerName || emailPrefix, score: 0 }],
        votes: {},
        hints: [],
        readyPlayers: [],
        gameData: {},
        selectedTopic: finalTopic,
        bettingAmount: finalBettingAmount,
      };


      const roomCode = await createRoomAtomic(roomData);

      if (gameMode === "Offline") {
        navigation.navigate("OfflineWaitingLobby", {
          roomCode,
          course: courseCategory,
          players: Number(players),
          rounds: Number(rounds),
          selectedTopic: finalTopic,
          isHost: true,
          clueTimer: Number(clueTimer),
          bettingAmount: finalBettingAmount,
        });
      } else {
        navigation.navigate("WaitingRoom", {
          roomCode,
          course: courseCategory,
          players: Number(players),
          isHost: true,
          isDemoMode: false,
          selectedTopic: finalTopic,
          clueTimer: Number(clueTimer),
          bettingAmount: finalBettingAmount,
        });
      }
    } catch (e) {
      Alert.alert("Error", `Failed to create room: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: "transparent", borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>CREATE ROOM</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* ── GAME MODE DROPDOWN ── */}
            <View style={styles.sectionLabelRow}>
              <Ionicons name="game-controller-outline" size={14} color={colors.primary} />
              <Text style={[styles.sectionLabel, typography.sub2, { color: colors.primary }]}>GAME MODE</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowModeModal(true)}
              activeOpacity={0.8}
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: gameMode === "Offline"
                    ? (colors.isDark ? "rgba(251,191,36,0.08)" : "#FFFBEB")
                    : (colors.isDark ? "rgba(0,185,111,0.08)" : "#ECFDF5"),
                  borderColor: gameMode === "Offline"
                    ? (colors.isDark ? "rgba(251,191,36,0.35)" : "#FDE68A")
                    : (colors.isDark ? "rgba(0,185,111,0.35)" : "rgba(16,185,129,0.3)"),
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons
                  name={gameMode === "Offline" ? "phone-portrait-outline" : "wifi-outline"}
                  size={18}
                  color={gameMode === "Offline" ? colors.warning : colors.success}
                />
                <Text style={[styles.dropdownText, typography.body1, {
                  color: gameMode === "Offline" ? colors.warning : colors.success,
                  fontWeight: "800",
                }]}>
                  {gameMode}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {gameMode === "Offline" && (
              <View style={[styles.offlineBanner, {
                backgroundColor: colors.isDark ? "rgba(251,191,36,0.1)" : "#FFFBEB",
                borderColor: colors.isDark ? "rgba(251,191,36,0.25)" : "#FDE68A",
              }]}>
                <Ionicons name="people-circle-outline" size={16} color={colors.warning} />
                <Text style={[typography.body3, { color: colors.warning, flex: 1, lineHeight: 14 }]}>
                  Players join via room code using their own phones.
                </Text>
              </View>
            )}

            {/* ── DIVIDER ── */}
            <View style={[styles.modeDivider, { backgroundColor: colors.border }]} />

            {/* Select Game Category Dropdown */}
            <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Ionicons name="bulb-outline" size={14} color={colors.success} />
              <Text style={[styles.sectionLabel, typography.sub2, { color: colors.success }]}>SELECT TOPIC</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowTopicModal(true)}
              activeOpacity={0.8}
              style={[styles.dropdownTrigger, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}
            >
              <Text style={[styles.dropdownText, typography.body1, { color: colors.textPrimary }]}>
                {selectedTopic ? selectedTopic.answer : "ACCA (Finance)"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Players */}
            <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Ionicons name="people-outline" size={14} color={colors.success} />
              <Text style={[styles.sectionLabel, typography.sub2, { color: colors.success }]}>MAX PLAYERS</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setPlayers(n)}
                    style={[
                      styles.countCircle,
                      players === n
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.countText, typography.h5, { color: players === n ? "#FFFFFF" : colors.textSecondary }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Rounds */}
            {/* <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Ionicons name="repeat-outline" size={14} color={colors.success} />
              <Text style={[styles.sectionLabel, typography.sub2, { color: colors.success }]}>NUMBER OF ROUNDS</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRounds(n)}
                  style={[
                    styles.countCircle,
                    rounds === n
                      ? { backgroundColor: colors.success, borderColor: colors.success }
                      : { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }
                  ]}
                >
                  <Text style={[styles.countText, typography.h5, { color: rounds === n ? "#FFFFFF" : colors.textSecondary }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View> */}

            {/* Clue Timer */}
            <>
              <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
                <Ionicons name="time-outline" size={14} color={colors.success} />
                <Text style={[styles.sectionLabel, typography.sub2, { color: colors.success }]}>CLUE TIMER</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  { label: "1 Min", val: 60 },
                  { label: "2 Min", val: 120 },
                  { label: "No Limit", val: 0 }
                ].map((t) => (
                  <TouchableOpacity
                    key={t.val}
                    onPress={() => setClueTimer(t.val)}
                    style={[
                      styles.countCircle,
                      { width: t.val === 0 ? 90 : 70 },
                      clueTimer === t.val
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.countText, typography.h7, { color: clueTimer === t.val ? "#FFFFFF" : colors.textSecondary, fontWeight: "600" }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>

            {/* Betting Amount */}
            <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Ionicons name="cash-outline" size={14} color={colors.success} />
              <Text style={[styles.sectionLabel, typography.sub2, { color: colors.success }]}>game play points</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              {[50, 100, 250, 500].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => {
                    setBettingAmount(amt);
                    setCustomBettingAmount("");
                    setIsCustomBetting(false);
                  }}
                  style={[
                    styles.countCircle,
                    { width: 65 },
                    bettingAmount === amt && !isCustomBetting
                      ? { backgroundColor: colors.success, borderColor: colors.success }
                      : { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }
                  ]}
                >
                  <Text style={[styles.countText, typography.h7, { color: bettingAmount === amt && !isCustomBetting ? "#FFFFFF" : colors.textSecondary }]}>
                    {amt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  setIsCustomBetting(true);
                  if (customBettingAmount) {
                    setBettingAmount(Number(customBettingAmount));
                  } else {
                    setBettingAmount(0);
                  }
                }}
                style={[
                  styles.countCircle,
                  { width: 85 },
                  isCustomBetting
                    ? { backgroundColor: colors.success, borderColor: colors.success }
                    : { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }
                ]}
              >
                <Text style={[styles.countText, typography.h7, { color: isCustomBetting ? "#FFFFFF" : colors.textSecondary }]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {isCustomBetting && (
              <View style={[styles.customInputContainer, { borderColor: colors.border, backgroundColor: colors.isDark ? "#000000" : "#F8FAFC" }]}>
                <TextInput
                  style={[styles.customInput, { color: colors.textPrimary }]}
                  placeholder="Enter custom amount..."
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                  value={customBettingAmount}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, "");
                    setCustomBettingAmount(cleaned);
                    if (cleaned) {
                      setBettingAmount(Number(cleaned));
                    } else {
                      setBettingAmount(0);
                    }
                  }}
                />
              </View>
            )}

            <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.85} style={styles.btnWrap}>
              <LinearGradient
                colors={loading ? [colors.textDisabled, colors.textDisabled] : (gameMode === "Offline" ? ["#F59E0B", "#D97706"] : colors.gradientSuccess)}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                {loading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <>
                    <Ionicons name={gameMode === "Offline" ? "phone-portrait-outline" : "add-circle-outline"} size={20} color="#FFF" />
                    <Text style={[styles.btnText, typography.btn1]}>
                      {gameMode === "Offline" ? "CREATE OFFLINE ROOM" : "CREATE ROOM"}
                    </Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── GAME MODE MODAL ── */}
        <Modal visible={showModeModal} transparent animationType="fade" onRequestClose={() => setShowModeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, typography.h5, { color: colors.textPrimary }]}>Select Game Mode</Text>
                <TouchableOpacity onPress={() => setShowModeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {[
                { value: "Multiplayer", icon: "wifi-outline", label: "Multiplayer", sub: "Online • Real-time • Each player on own phone", color: colors.success },
                { value: "Offline", icon: "phone-portrait-outline", label: "Offline", sub: "Pass & Play individual phones", color: colors.warning },
              ].map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => { setGameMode(m.value); setShowModeModal(false); }}
                  style={[
                    styles.modeOption,
                    gameMode === m.value && {
                      backgroundColor: m.value === "Offline"
                        ? (colors.isDark ? "rgba(251,191,36,0.12)" : "#FFFBEB")
                        : (colors.isDark ? "rgba(0,185,111,0.12)" : "#ECFDF5"),
                      borderColor: m.color,
                    },
                    { borderColor: gameMode === m.value ? m.color : colors.border },
                  ]}
                >
                  <View style={[styles.modeOptionIcon, {
                    backgroundColor: m.value === "Offline"
                      ? (colors.isDark ? "rgba(251,191,36,0.15)" : "#FEF3C7")
                      : (colors.isDark ? "rgba(0,185,111,0.15)" : "#D1FAE5"),
                  }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.h6, { color: m.color }]}>{m.label}</Text>
                    <Text style={[typography.body3, { color: colors.textSecondary }]}>{m.sub}</Text>
                  </View>
                  {gameMode === m.value && <Ionicons name="checkmark-circle" size={22} color={m.color} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={showTopicModal} transparent animationType="fade" onRequestClose={() => setShowTopicModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, height: "70%", paddingBottom: 10 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, typography.h5, { color: colors.textPrimary }]}>Select Topic</Text>
                <TouchableOpacity onPress={() => setShowTopicModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={{ flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderColor: colors.border }}>
                <TouchableOpacity
                  onPress={() => setTopicModalTab("categories")}
                  style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: topicModalTab === "categories" ? 2 : 0, borderColor: colors.success }}
                >
                  <Text style={[typography.body2, { color: topicModalTab === "categories" ? colors.success : colors.textSecondary, fontWeight: "bold" }]}>Categories</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTopicModalTab("topics")}
                  style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: topicModalTab === "topics" ? 2 : 0, borderColor: colors.success }}
                >
                  <Text style={[typography.body2, { color: topicModalTab === "topics" ? colors.success : colors.textSecondary, fontWeight: "bold" }]}>Specific Topics</Text>
                </TouchableOpacity>
              </View>

              {topicModalTab === "topics" && (
                <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: colors.isDark ? "#000" : "#FFF" }}>
                  <Ionicons name="search" size={16} color={colors.textDisabled} style={{ marginRight: 6 }} />
                  <TextInput
                    value={topicSearchQuery}
                    onChangeText={setTopicSearchQuery}
                    placeholder="Search specific topics..."
                    placeholderTextColor={colors.textDisabled}
                    style={{ flex: 1, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                  />
                  {topicSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setTopicSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {topicModalTab === "categories" ? (
                  [
                    { id: "random_acca", category: "ACCA", answer: "ACCA (Finance)" },
                    { id: "random_cma", category: "CMA", answer: "CMA (Finance)" },
                    { id: "random_movies", category: "movies", answer: "Movies" },
                    { id: "random_sports", category: "sports", answer: "Sports" },
                    { id: "random_anime", category: "anime", answer: "Anime" },
                    { id: "random_science", category: "science", answer: "Science" },
                    { id: "random_history", category: "history", answer: "History" },
                    { id: "random_technology", category: "technology", answer: "Technology" },
                    { id: "random_food", category: "food", answer: "Food" },
                    { id: "random_countries", category: "countries", answer: "Countries" },
                    { id: "random_business", category: "business", answer: "Business" },
                    { id: "random_medicine", category: "medicine", answer: "Medicine" },
                    { id: "random_programming", category: "programming", answer: "Programming" },
                    { id: "random_music", category: "music", answer: "Music" }
                  ].map((item) => {
                    const isSelected = (!selectedTopic && item.id === "random_acca") || (selectedTopic && selectedTopic.id === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setSelectedTopic(item);
                          setShowTopicModal(false);
                        }}
                        style={[
                          styles.modalItem,
                          isSelected && { backgroundColor: colors.isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5" }
                        ]}
                      >
                        <Text style={[styles.modalItemText, typography.body1, { color: isSelected ? colors.success : colors.textPrimary }]}>
                          {item.answer}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={colors.success} />}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  topics
                    .filter(t => t.answer.toLowerCase().includes(topicSearchQuery.toLowerCase()))
                    .map((item) => {
                      const isSelected = selectedTopic && selectedTopic.id === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            setSelectedTopic(item);
                            setShowTopicModal(false);
                          }}
                          style={[
                            styles.modalItem,
                            isSelected && { backgroundColor: colors.isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5" }
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.modalItemText, typography.body1, { color: isSelected ? colors.success : colors.textPrimary }]}>
                              {item.answer}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{item.category.toUpperCase()}</Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark" size={18} color={colors.success} />}
                        </TouchableOpacity>
                      );
                    })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
  scroll: { padding: 12, paddingBottom: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 16, padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#059669", letterSpacing: 1.5 },
  offlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginTop: 6 },
  modeDivider: { height: 1, marginVertical: 8 },
  modeOption: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 10 },
  modeOptionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  dropdownTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    height: 42, marginTop: 4,
  },
  dropdownText: { fontSize: 15, fontWeight: "600" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalCard: {
    width: "100%", maxHeight: "80%", borderRadius: 24, borderWidth: 1,
    padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalList: { marginTop: 8 },
  modalItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4,
  },
  modalItemText: { fontSize: 15, fontWeight: "600" },
  searchBar: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, height: 44, marginBottom: 12, gap: 8,
  },
  searchInput: { flex: 1, height: "100%", padding: 0 },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5,
  },
  countCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  countCircleActive: { backgroundColor: "#059669", borderColor: "#10B981" },
  countText: { color: "#64748B", fontSize: 14, fontWeight: "700" },
  countTextActive: { color: "#FFF" },
  btnWrap: { borderRadius: 12, overflow: "hidden", marginTop: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 12 },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1.5 },
  customInputContainer: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, height: 38, marginTop: 4, marginBottom: 8,
    justifyContent: "center",
  },
  customInput: {
    fontSize: 14,
    height: "100%",
    padding: 0,
  },
});
