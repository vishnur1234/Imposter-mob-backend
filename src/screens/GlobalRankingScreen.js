import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/authService";
import { getRankings } from "../services/statsService";
import { useTheme } from "../context/ThemeContext";
import { getPlayerAvatar } from "../services/avatarService";

const { width } = Dimensions.get("window");

const MEDALS = [
  { rank: 1, bg: ["#FFD23F", "#FF6B00"], glow: "#FFD23F", label: "1ST", chip: "LEGEND" },
  { rank: 2, bg: ["#9FFCE0", "#00C2A8"], glow: "#5EEAD4", label: "2ND", chip: "ELITE" },
  { rank: 3, bg: ["#FF8FE3", "#B4459C"], glow: "#F472B6", label: "3RD", chip: "ELITE" },
];

const AVATAR_PALETTE = ["#00E5FF", "#39FF14", "#FF2E92", "#FFD23F", "#A855F7", "#FF4D4D", "#00FFC2"];

function getAvatarColor(seed = "") {
  const sum = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function formatScore(n) {
  const v = typeof n === "number" ? n : 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v}`;
}

function tierForRank(rank) {
  if (rank === 1) return "champion";
  if (rank <= 3) return "podium";
  if (rank <= 10) return "contender";
  return "field";
}

function AnimatedCounter({ value, style, duration = 900, delay = 0, formatter = formatScore }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value || 0,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{formatter(display)}</Text>;
}

function RankBadge({ rank, tone, accent }) {
  return (
    <View style={badgeStyles.wrap}>
      <View style={[badgeStyles.plate, { backgroundColor: tone, borderColor: accent, shadowColor: accent }]}>
        <Text style={[badgeStyles.num, { color: accent }]}>{rank}</Text>
      </View>
      <View style={[badgeStyles.notch, { borderTopColor: tone }]} />
    </View>
  );
}

function HexAvatar({ initial, color, size = 46, glowColor, ring = false, isDark = true, playerName }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: isDark ? "#0A0E1A" : "#F0F4FF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: glowColor || color,
          shadowOpacity: 0.95,
          shadowRadius: ring ? 18 : 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
          borderWidth: ring ? 2.5 : 2,
          borderColor: glowColor || color,
          transform: [{ rotate: "45deg" }],
          overflow: "hidden",
        }}
      >
        <View style={{ transform: [{ rotate: "-45deg" }], width: "115%", height: "115%", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
          {playerName ? (
            <Image
              source={getPlayerAvatar(playerName)}
              style={{ width: "90%", height: "90%" }}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={{
                color: color,
                fontSize: size * 0.42,
                fontWeight: "900",
              }}
            >
              {initial}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function PodiumCard({ player, rank, isMe, colors, index }) {
  const cfg = MEDALS.find((m) => m.rank === rank) || MEDALS[2];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 520,
      delay: index * 110,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();

    if (rank === 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 950, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    }
  }, []);

  const heights = { 1: 128, 2: 96, 3: 80 };
  const avatarSizes = { 1: 66, 2: 52, 3: 46 };
  const initial = player?.name ? player.name[0].toUpperCase() : "?";
  const avatarColor = player?.avatarColor || "#00E5FF";

  const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <Animated.View
      style={[
        podiumStyles.card,
        { width: rank === 1 ? 128 : 102, opacity: enterAnim, transform: [{ translateY }] },
      ]}
    >
      {rank === 1 && (
        <Animated.View
          style={[
            podiumStyles.glowRing,
            { shadowColor: cfg.glow, transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}

      {rank === 1 && (
        <Animated.View style={[podiumStyles.crownWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="flash" size={22} color="#FFD23F" />
          <Text style={podiumStyles.crownLabel}>MVP</Text>
        </Animated.View>
      )}

      <HexAvatar
        initial={initial}
        color={avatarColor}
        size={avatarSizes[rank]}
        glowColor={cfg.glow}
        ring={rank === 1}
        isDark={colors.isDark}
        playerName={player?.name}
      />

      <View style={[podiumStyles.tierChip, { backgroundColor: `${cfg.glow}22`, borderColor: `${cfg.glow}77` }]}>
        <Text style={[podiumStyles.tierChipText, { color: cfg.glow }]}>{cfg.chip}</Text>
      </View>

      <Text style={[podiumStyles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
        {player?.name || "Player"}
      </Text>

      {isMe && (
        <View style={[podiumStyles.youTag, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <Text style={podiumStyles.youTagText}>YOU</Text>
        </View>
      )}

      <LinearGradient colors={cfg.bg} style={[podiumStyles.plinth, { height: heights[rank], shadowColor: cfg.glow }]}>
        <View style={podiumStyles.plinthGrid} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={podiumStyles.plinthGridLine} />
          ))}
        </View>
        <View style={podiumStyles.plinthSheen} pointerEvents="none" />
        <View style={podiumStyles.plinthInner}>
          <Text style={podiumStyles.plinthRank}>{cfg.label}</Text>
          <AnimatedCounter
            value={player?.highScore ?? 0}
            style={podiumStyles.plinthScore}
            delay={300 + index * 110}
            duration={1100}
          />
          <Text style={podiumStyles.plinthCoins}>PTS</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function LeaderboardRow({ player, rank, isMe, colors, index, styleSet }) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const tier = tierForRank(rank);
  const initial = player.name ? player.name[0].toUpperCase() : "?";

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 14) * 35,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const isContender = tier === "contender";
  const badgeAccent = isMe ? colors.primary : isContender ? "#00E5FF" : styleSet.rankNumColor;
  const badgePlate = isMe ? styleSet.rowMeBg : isContender ? styleSet.contenderPlate : styleSet.rowBg;

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: styleSet.rowBg, borderColor: styleSet.rowBorder, opacity: enterAnim, transform: [{ translateX }] },
        isMe && {
          backgroundColor: styleSet.rowMeBg,
          borderColor: styleSet.rowMeBorder,
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 5,
        },
        !isMe && isContender && {
          borderColor: styleSet.contenderBorder,
        },
      ]}
    >
      <RankBadge rank={rank} tone={badgePlate} accent={badgeAccent} />

      <View
        style={[
          styles.rowAvatar,
          { backgroundColor: colors.isDark ? "#0A0E1A" : "#F0F4FF", borderColor: player.avatarColor, shadowColor: player.avatarColor, overflow: "hidden" },
          isMe && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        <Image
          source={getPlayerAvatar(player.name)}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>

      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowName, { color: isMe ? colors.primary : styleSet.rowNameColor }]}
          numberOfLines={1}
        >
          {player.name || "Player"}
        </Text>
        {isMe && (
          <View style={[styles.youChip, { backgroundColor: colors.primary }]}>
            <Text style={styles.youChipText}>YOU</Text>
          </View>
        )}
        {!isMe && isContender && (
          <View style={[styles.streakChip, { borderColor: "#00E5FF55", backgroundColor: "#00E5FF1A" }]}>
            <Ionicons name="flame" size={9} color="#00E5FF" />
            <Text style={styles.streakChipText}>TOP 10</Text>
          </View>
        )}
      </View>

      <View style={styles.rowScoreWrap}>
        <Ionicons name="game-controller" size={12} color="#FFD23F" style={{ marginRight: 4 }} />
        <Text style={[styles.rowScore, { color: isMe ? colors.primary : styleSet.rowScoreColor }]}>
          {formatScore(player.highScore)}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function GlobalRankingScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [myPreciseRank, setMyPreciseRank] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const myUid = auth.currentUser?.uid || "guest";
  const listFadeAnim = useRef(new Animated.Value(0)).current;
  const headerEnter = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerEnter, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    getRankings(50)
      .then(({ rankings: top, totalUsers: total, myRank, me }) => {
        setRankings(
          top.map((p) => ({ ...p, avatarColor: getAvatarColor(p.uid + (p.name || "")) }))
        );
        setTotalUsers(total);
        setUserStats(me);
        setMyPreciseRank(myUid !== "guest" ? myRank : 0);
        setLoading(false);
        Animated.timing(listFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      })
      .catch((err) => {
        console.error("Rankings error:", err);
        setLoading(false);
      });
  }, [myUid]);

  const t = useMemo(() => {
    const isDark = colors.isDark;
    return {
      bgGradient: isDark
        ? ["#05070D", "#0B0F1C", "#05070D"]
        : ["#F0F4FF", "#FFFFFF", "#EAF0FF"],
      headerBg: isDark ? "rgba(0,229,255,0.05)" : "rgba(20,101,241,0.06)",
      headerBorder: isDark ? "rgba(0,229,255,0.18)" : "rgba(20,101,241,0.22)",
      glowLineColor: isDark ? "#00E5FF" : "#1465F1",
      podiumSectionBg: isDark ? "rgba(0,229,255,0.04)" : "rgba(20,101,241,0.04)",
      podiumBorderColor: isDark ? "rgba(0,229,255,0.18)" : "rgba(20,101,241,0.18)",
      scanlineColor: isDark ? "rgba(0,229,255,0.06)" : "rgba(20,101,241,0.05)",
      sectionLabelColor: isDark ? "#3A4A6B" : "#8899BB",
      rowBg: isDark ? "rgba(255,255,255,0.025)" : "rgba(20,101,241,0.04)",
      rowBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(20,101,241,0.12)",
      rowMeBg: isDark ? "rgba(0,229,255,0.10)" : "rgba(20,101,241,0.10)",
      rowMeBorder: isDark ? "rgba(0,229,255,0.45)" : "rgba(20,101,241,0.5)",
      contenderPlate: isDark ? "rgba(0,229,255,0.08)" : "rgba(20,101,241,0.08)",
      contenderBorder: isDark ? "rgba(0,229,255,0.25)" : "rgba(20,101,241,0.28)",
      rankNumColor: isDark ? "#475569" : "#8899BB",
      rowNameColor: isDark ? "#CBD5E1" : "#1A2A4A",
      rowScoreColor: isDark ? "#94A3B8" : "#4A5A7A",
      panelBg: isDark ? ["#0F1C3A", "#16284F"] : ["#DDEEFF", "#EAF2FF"],
      panelBorder: isDark ? "rgba(0,229,255,0.4)" : "rgba(20,101,241,0.4)",
      myNameColor: isDark ? "#E2E8F0" : "#1A2A4A",
      myRankColor: isDark ? "#7C8BAE" : "#5A6A8A",
      myScoreBoxBg: isDark ? "rgba(255,210,63,0.10)" : "rgba(255,160,0,0.10)",
      myScoreBoxBorder: isDark ? "rgba(255,210,63,0.35)" : "rgba(255,160,0,0.40)",
      liveChipBg: isDark ? "rgba(255,46,146,0.12)" : "rgba(255,46,146,0.10)",
      liveChipBorder: isDark ? "rgba(255,46,146,0.3)" : "rgba(255,46,146,0.35)",
      myAvatarBorder: isDark ? "rgba(0,229,255,0.6)" : "rgba(20,101,241,0.6)",
      headerTitleColor: isDark ? "#00E5FF" : "#1465F1",
      headerSubColor: isDark ? "#5B6B8C" : "#7A8BAA",
      backIconColor: isDark ? "#00E5FF" : "#1465F1",
      hudPillTextColor: isDark ? "#00E5FF" : "#1465F1",
      sectionLineColor: isDark ? "rgba(0,229,255,0.15)" : "rgba(20,101,241,0.18)",
      emptyTextColor: isDark ? "#5B6B8C" : "#8899BB",
      bottomGradientColors: isDark
        ? ["rgba(5,7,13,0)", "rgba(5,7,13,0.98)"]
        : ["rgba(240,244,255,0)", "rgba(240,244,255,0.98)"],
      myAvatarBg: isDark ? "#0A0E1A" : "#E6EEFF",
      myAvatarTextColor: isDark ? "#00E5FF" : "#1465F1",
    };
  }, [colors.isDark]);

  if (loading) {
    const loadBg = colors.isDark
      ? ["#05070D", "#0B0F1C", "#05070D"]
      : ["#F0F4FF", "#FFFFFF", "#EAF0FF"];
    const loadAccent = colors.isDark ? "#00E5FF" : "#1465F1";
    return (
      <LinearGradient colors={loadBg} style={styles.centerBg}>
        <View style={styles.loadingPulseOuter}>
          <ActivityIndicator size="large" color={loadAccent} />
        </View>
        <Text style={[typography.body2, { color: loadAccent, marginTop: 14, letterSpacing: 2, fontWeight: "900" }]}>
          SYNCING RANKINGS…
        </Text>
      </LinearGradient>
    );
  }

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const headerTranslate = headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  const scanTranslate = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 320] });

  return (
    <LinearGradient colors={t.bgGradient} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ opacity: headerEnter, transform: [{ translateY: headerTranslate }] }}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: t.headerBg, borderColor: t.headerBorder }]}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={t.backIconColor} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: t.headerTitleColor }]}>LEADERBOARD</Text>
              <Text style={[styles.headerSub, { color: t.headerSubColor }]}>GLOBAL RANKINGS </Text>
            </View>

            <View style={[styles.liveDot, { backgroundColor: t.liveChipBg, borderColor: t.liveChipBorder }]}>
              <View style={styles.liveDotInner} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.hudStrip}>
            <View style={[styles.hudPill, { backgroundColor: t.headerBg, borderColor: t.headerBorder }]}>
              <Ionicons name="people" size={12} color={t.hudPillTextColor} />
              <Text style={[styles.hudPillText, { color: t.hudPillTextColor }]}>{(totalUsers || rankings.length)} COMPETING</Text>
            </View>
            <View style={[styles.hudPill, { backgroundColor: t.headerBg, borderColor: t.headerBorder }]}>
              <Ionicons name="podium" size={12} color={t.hudPillTextColor} />
              <Text style={[styles.hudPillText, { color: t.hudPillTextColor }]}>{myPreciseRank > 0 ? `YOU · #${myPreciseRank}` : "UNRANKED"}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.glowLineWrap}>
          <View style={[styles.glowLine, { backgroundColor: t.glowLineColor, shadowColor: t.glowLineColor }]} />
          <Animated.View
            style={[
              styles.glowLineSweep,
              { transform: [{ translateX: scanTranslate }] },
            ]}
          />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {top3.length >= 1 && (
            <View style={[styles.podiumSection, { backgroundColor: t.podiumSectionBg, borderBottomColor: t.podiumBorderColor }]}>
              <View style={styles.scanlines} pointerEvents="none">
                {Array.from({ length: 14 }).map((_, i) => (
                  <View key={i} style={[styles.scanlineBar, { backgroundColor: t.scanlineColor }]} />
                ))}
              </View>

              <View style={styles.podiumRow}>
                {podiumOrder.map((player, i) => {
                  if (!player) return <View key={i} style={{ width: 102 }} />;
                  const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                  return (
                    <PodiumCard
                      key={player.uid || i}
                      player={player}
                      rank={rank}
                      isMe={player.uid === myUid}
                      colors={colors}
                      index={i}
                    />
                  );
                })}
              </View>
            </View>
          )}

          <Animated.View style={{ opacity: listFadeAnim }}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionLabelLine, { backgroundColor: t.sectionLineColor }]} />
              <Text style={[styles.sectionLabel, { color: t.sectionLabelColor }]}>ALL PLAYERS</Text>
              <View style={[styles.sectionLabelLine, { backgroundColor: t.sectionLineColor }]} />
            </View>

            {rest.map((player, idx) => {
              const rank = idx + 4;
              const isMe = player.uid === myUid;
              return (
                <LeaderboardRow
                  key={player.uid || idx}
                  player={player}
                  rank={rank}
                  isMe={isMe}
                  colors={colors}
                  index={idx}
                  styleSet={t}
                />
              );
            })}

            {rankings.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={32} color={t.glowLineColor} />
                <Text style={[styles.emptyStateText, { color: t.emptyTextColor }]}>No scores yet. Be the first on the board.</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <LinearGradient
          colors={t.bottomGradientColors}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        <View style={styles.myPanel}>
          <LinearGradient colors={t.panelBg} style={[styles.myPanelInner, { borderColor: t.panelBorder }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.myAvatar,
                  {
                    backgroundColor: t.myAvatarBg,
                    borderColor: t.myAvatarBorder,
                    shadowColor: t.myAvatarBorder,
                    overflow: "hidden",
                  },
                ]}
              >
                <Image
                  source={getPlayerAvatar(userStats?.playerName || userStats?.name)}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.myName, { color: t.myNameColor }]} numberOfLines={1}>
                  {userStats?.playerName || userStats?.name || "Player"}
                </Text>
                <Text style={[styles.myRankText, { color: t.myRankColor }]}>
                  {myPreciseRank > 0 ? `RANK #${myPreciseRank} OF ${totalUsers || rankings.length}` : "UNRANKED"}
                </Text>
              </View>
            </View>

            <View style={[styles.myScoreBox, { backgroundColor: t.myScoreBoxBg, borderColor: t.myScoreBoxBorder }]}>
              <Ionicons name="game-controller" size={14} color="#FFD23F" />
              <AnimatedCounter value={userStats?.highScore ?? 0} style={styles.myScore} duration={800} />
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { width: 30, alignItems: "center" },
  plate: {
    width: 26,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  num: { fontSize: 12, fontWeight: "900", letterSpacing: 0.3 },
  notch: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
});

const podiumStyles = StyleSheet.create({
  card: { alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 4 },
  glowRing: {
    position: "absolute",
    top: 14,
    width: 78,
    height: 78,
    borderRadius: 18,
    shadowOpacity: 0.95,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  crownWrap: { marginBottom: 4, alignItems: "center" },
  crownLabel: { color: "#FFD23F", fontSize: 8, fontWeight: "900", letterSpacing: 1.5, marginTop: 1 },
  tierChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  tierChipText: { fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  podiumName: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 3,
    letterSpacing: 0.4,
    textAlign: "center",
    maxWidth: 96,
  },
  youTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    marginBottom: 5,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  youTagText: { color: "#FFF", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  plinth: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    overflow: "hidden",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  plinthGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between" },
  plinthGridLine: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  plinthSheen: {
    position: "absolute",
    top: 0,
    left: -20,
    right: -20,
    height: "55%",
    backgroundColor: "rgba(255,255,255,0.15)",
    transform: [{ skewY: "-6deg" }],
  },
  plinthInner: { alignItems: "center" },
  plinthRank: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  plinthScore: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: 2, fontVariant: ["tabular-nums"] },
  plinthCoins: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: "700", letterSpacing: 1, marginTop: 1 },
});

const styles = StyleSheet.create({
  bg: { flex: 1 },
  centerBg: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingPulseOuter: { padding: 18, borderRadius: 100 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 3, color: "#00E5FF" },
  headerSub: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: 2, color: "#5B6B8C" },
  liveDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF2E92" },
  liveText: { color: "#FF2E92", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },

  hudStrip: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 14,
  },
  hudPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  hudPillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, color: "#00E5FF" },

  glowLineWrap: { height: 2, overflow: "hidden", position: "relative" },
  glowLine: { height: 1, shadowOpacity: 1, shadowRadius: 8, elevation: 10 },
  glowLineSweep: {
    position: "absolute",
    top: 0,
    width: 60,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
  },

  scrollContent: { paddingBottom: 130 },

  podiumSection: {
    paddingTop: 30,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  scanlines: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 14 },
  scanlineBar: { height: 1 },
  podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6 },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: "rgba(0,229,255,0.15)" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.5,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  rowAvatarText: { fontSize: 15, fontWeight: "900" },
  rowInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  rowName: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  youChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  youChipText: { color: "#FFF", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  streakChipText: { color: "#00E5FF", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  rowScoreWrap: { flexDirection: "row", alignItems: "center" },
  rowScore: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyStateText: { fontSize: 13, fontWeight: "600", color: "#5B6B8C" },

  bottomGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 110 },

  myPanel: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  myPanelInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#00E5FF",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
    gap: 10,
  },
  myAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  myAvatarText: { fontSize: 16, fontWeight: "900" },
  myName: { fontSize: 14, fontWeight: "800" },
  myRankText: { fontSize: 11, fontWeight: "700", marginTop: 2, letterSpacing: 0.5 },
  myScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  myScore: { color: "#FBBF24", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontVariant: ["tabular-nums"] },
});