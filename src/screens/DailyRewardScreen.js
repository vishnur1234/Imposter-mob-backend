import React, { useState, useEffect, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Animated, Easing, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { TreasureChestIcon } from "phosphor-react-native";
import { auth } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import { claimDailyReward, getMyStats } from "../services/statsService";
import { scheduleDailyRewardNotification } from "../services/notificationService";

const { width } = Dimensions.get("window");

export default function DailyRewardScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const myUid = auth.currentUser?.uid || "guest";
  const dayInMs = 24 * 60 * 60 * 1000;

  // 1. Load user stats
  useEffect(() => {
    if (myUid === "guest") {
      setLoading(false);
      return;
    }
    getMyStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, [myUid]);


  const lastClaimed = stats?.lastDailyRewardClaimed || 0;
  const isClaimable = Date.now() - lastClaimed >= dayInMs;


  useEffect(() => {
    let pulse;
    if (isClaimable && !loading) {
      scaleAnim.setValue(1);
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.06, duration: 1200, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1200, easing: Easing.ease, useNativeDriver: true }),
        ])
      );
      pulse.start();
    } else {
      if (pulse) pulse.stop();
      scaleAnim.setValue(1);
    }
    return () => pulse && pulse.stop();
  }, [isClaimable, loading]);

  // 4. Live Countdown Ticker
  useEffect(() => {
    const updateTicker = () => {
      const now = Date.now();
      const nextClaimTime = lastClaimed + dayInMs;
      const diff = nextClaimTime - now;

      if (diff <= 0) {
        setTimeRemaining("");
      } else {
        const hrs = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeRemaining(
          `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      }
    };

    updateTicker(); 
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [lastClaimed]);


  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const triggerBounce = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.25, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // 6. Reward Claim function
  const handleClaimReward = async () => {
    if (claiming) return;

    if (!isClaimable) {
      triggerShake();
      Alert.alert(
        "Chest Locked",
        `Your daily reward is currently charging.\n\nCome back in ${timeRemaining} to unlock it!`
      );
      return;
    }

    triggerBounce();
    setClaiming(true);

    try {
      const updated = await claimDailyReward(myUid);
      setStats(updated);
      await scheduleDailyRewardNotification(86400);

      Alert.alert("Success", "Reward unlocked! +500 coins added to your balance.");
    } catch (e) {
      Alert.alert("Error", "Failed to unlock reward: " + e.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={colors.gradientBg} style={styles.centerBg}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 12 }]}>Loading Reward Status...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>DAILY REWARD</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.content}>
          {/* Main Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            
            {/* Title / Description */}
            <View style={styles.titleSection}>
              <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: "900", textAlign: "center" }]}>
                {isClaimable ? "Treasure Chest Ready!" : "Chest Recharging"}
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginTop: 6 }]}>
                {isClaimable
                  ? "Tap the glowing chest below to claim your free daily coin reward!"
                  : "You have already claimed today's reward. Come back tomorrow!"}
              </Text>
            </View>

            {/* Interactive Chest Animation */}
            <View style={styles.animationContainer}>
              <Animated.View
                style={{
                  transform: [
                    { translateX: shakeAnim },
                    { scale: scaleAnim }
                  ]
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleClaimReward}
                  style={[
                    styles.chestCircle,
                    {
                      borderColor: isClaimable ? "#F59E0B" : colors.border,
                      backgroundColor: isClaimable ? "rgba(245,158,11,0.05)" : (colors.isDark ? "#121212" : "#F8FAFC"),
                    }
                  ]}
                >
                  <LinearGradient
                    colors={isClaimable ? ["#FCD34D", "#F59E0B"] : ["#94A3B8", "#64748B"]}
                    style={styles.innerChestCircle}
                  >
                    <TreasureChestIcon
                      size={64}
                      color="#FFFFFF"
                      weight={isClaimable ? "fill" : "regular"}
                    />
                  </LinearGradient>

                  {/* Locked status padlock */}
                  {!isClaimable && (
                    <View style={[styles.lockIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="lock-closed" size={16} color={colors.error} />
                    </View>
                  )}

                  {/* Pulsing glow ring when claimable */}
                  {isClaimable && (
                    <View style={styles.glowRing} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Ticker / Button Section */}
            <View style={styles.actionSection}>
              {isClaimable ? (
                <TouchableOpacity
                  onPress={handleClaimReward}
                  disabled={claiming}
                  style={styles.claimButtonWrap}
                >
                  <LinearGradient
                    colors={["#FBBF24", "#F59E0B"]}
                    style={styles.claimButton}
                  >
                    {claiming ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={[typography.btn1, { color: "#FFFFFF" }]}>CLAIM 500 COINS</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={[styles.lockedCard, { backgroundColor: colors.isDark ? "#0A0A0A" : "#F8FAFC", borderColor: colors.border }]}>
                  <Text style={[typography.sub8, { color: colors.textSecondary, letterSpacing: 1 }]}>NEXT REWARD IN</Text>
                  <Text style={[styles.timerText, typography.h2, { color: colors.textPrimary }]}>
                    {timeRemaining}
                  </Text>
                </View>
              )}
            </View>

            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  await scheduleDailyRewardNotification(5);
                  Alert.alert(
                    "Scheduled",
                    "Test notification scheduled in 5 seconds.\n\nLock your screen or put the app in the background to test it!"
                  );
                }}
                style={{ marginTop: 18 }}
                activeOpacity={0.7}
              >
                <Text style={[typography.body3, { color: colors.primary, textDecorationLine: "underline" }]}>
                  Test Notification (5s Delay)
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  centerBg: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 450,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  titleSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  animationContainer: {
    marginVertical: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  chestCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  innerChestCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
  },
  lockIndicator: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  glowRing: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.3)",
    borderStyle: "dashed",
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
  },
  claimButtonWrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  lockedCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  timerText: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 2,
  },
});
