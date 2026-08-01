import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { getMyStats, getHistory } from "../services/statsService";
import { useTheme } from "../context/ThemeContext";

let memoryStatsCache = null;
let memoryHistoryCache = null;

export default function CoinHistoryScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [stats, setStats] = useState(memoryStatsCache);
  const [history, setHistory] = useState(memoryHistoryCache || []);
  const [loading, setLoading] = useState(!memoryHistoryCache);

  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!myUid) {
      setLoading(false);
      return;
    }

    getMyStats()
      .then((data) => {
        setStats(data);
        memoryStatsCache = data;
      })
      .catch((err) => console.error("Error fetching stats:", err));

    getHistory(30)
      .then((list) => {
        setHistory(list);
        memoryHistoryCache = list;
      })
      .catch((err) => console.error("Error fetching history:", err))
      .finally(() => setLoading(false));
  }, [myUid]);



  return (
    <LinearGradient colors={colors.gradientBg} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header navigation bar */}
        <View style={[styles.header, { backgroundColor: "transparent", borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.isDark ? "#121212" : "#F1F5F9", borderColor: colors.border }]}
          >
            <Text style={[styles.backBtnText, typography.btn2, { color: colors.textSecondary }]}>← BACK</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>COIN HISTORY</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Total Balance Card */}
          <View style={[styles.balanceSection, { backgroundColor: colors.isDark ? "#0A0A0A" : "#F8FAFC", borderColor: colors.border }]}>
            <Text style={[typography.sub7, { color: colors.textSecondary }]}>TOTAL COINS ACCUMULATED</Text>
            <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 4, fontWeight: "900" }]}>
              {stats?.highScore ?? 0} <Text style={[typography.body2, { color: colors.textSecondary }]}>coins</Text>
            </Text>
          </View>

          {/* History List */}
          <View style={styles.historyList}>
            {history && history.length > 0 ? (

              history.map((item, idx) => {
                  const dateStr = item.timestamp
                    ? new Date(item.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Unknown Date";
                  const earned = item.score ?? 0;
                  const isEntryFee = item.isEntryFee || earned < 0;
                  const rowKey = `${item.gameId || idx}_${isEntryFee ? "fee" : "score"}`;

                  return (
                    <View
                      key={rowKey}
                      // key={`${item.gameId}-${item.timestamp}-${idx}`}
                      style={[
                        styles.historyRowItem,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[typography.body1, { color: colors.textPrimary, fontWeight: "bold" }]}>
                            {item.roomCode === "DAILY"
                              ? "Daily Reward"
                              : isEntryFee
                                ? `Entry Fee: Room ${item.roomCode || "N/A"}`
                                : `Match Score: Room ${item.roomCode || "N/A"}`}
                          </Text>
                          {item.roomCode !== "DAILY" && !isEntryFee && (
                            <View style={[styles.gameIdBadge, { backgroundColor: colors.isDark ? "#1E1E1E" : "#F1F5F9" }]}>
                              {/* <Text style={[typography.sub8, { color: colors.textSecondary, fontSize: 8 }]}>
                                ID: {item.gameId || "N/A"}
                              </Text> */}
                            </View>
                          )}
                        </View>
                        <Text style={[typography.body3, { color: colors.textSecondary, marginTop: 2 }]}>{dateStr}</Text>
                      </View>
                      <View style={styles.earnedPointsWrap}>
                        <Text
                          style={[
                            typography.body1,
                            {
                              color: earned > 0 ? colors.success : earned < 0 ? colors.error : colors.textSecondary,
                              fontWeight: "bold",
                            },
                          ]}
                        >
                          {earned > 0 ? `+${earned}` : `${earned}`}
                        </Text>
                      </View>
                    </View>
                  );
                })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textDisabled} style={{ marginBottom: 12 }} />
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center" }]}>
                  No matches played yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: { letterSpacing: 1 },
  headerTitle: { flex: 1, textAlign: "center", marginRight: 70, letterSpacing: 2, fontWeight: "900" },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },
  balanceSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  historyList: {
    gap: 10,
  },
  historyRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  gameIdBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earnedPointsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
