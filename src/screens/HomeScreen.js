import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Image,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { registerForPushNotificationsAsync } from "../services/notificationService";
import { auth } from "../services/authService";
import { getMyStats, updateMyProfile } from "../services/statsService";
import { useTheme } from "../context/ThemeContext";
import Svg, { Path, G } from "react-native-svg";

function MedalIcon({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="m22.21.939c-.365-.588-.997-.939-1.689-.939h-3.009c-1.534,0-2.909.854-3.587,2.23l-1.861,3.773c-.021,0-.042-.003-.063-.003-.014,0-.027.002-.041.002l-1.861-3.772c-.679-1.376-2.053-2.23-3.587-2.23h-3.009c-.692,0-1.324.351-1.69.939-.365.588-.4,1.31-.094,1.931l3.232,6.553c-1.217,1.535-1.95,3.471-1.95,5.578,0,4.962,4.038,9,9,9s9-4.038,9-9c0-2.099-.728-4.027-1.937-5.56l3.241-6.57c.307-.621.271-1.343-.094-1.931Zm-15.699,1.061c.767,0,1.454.427,1.793,1.115l1.555,3.153c-1.264.31-2.424.884-3.416,1.666L3.502,2h3.009Zm5.489,20c-3.86,0-7-3.14-7-7,0-3.66,2.825-6.668,6.409-6.97.001,0,.002,0,.004,0,.194-.016.39-.03.588-.03,3.86,0,7,3.14,7,7s-3.14,7-7,7Zm5.57-14.055c-.99-.784-2.148-1.359-3.41-1.672l1.558-3.158c.339-.688,1.026-1.115,1.793-1.115l3-.015-2.94,5.96Zm-1.413,6.465c0,.361-.251.665-.539.825l-1.49.828.661,1.803c.128.349.012.741-.285.965h0c-.304.229-.723.226-1.023-.007l-1.482-1.146-1.482,1.146c-.301.232-.72.235-1.023.007h0c-.297-.224-.413-.615-.285-.965l.661-1.803-1.49-.828c-.288-.16-.539-.464-.539-.825,0-.306.266-.644.696-.644h2.14l.567-2.175c.09-.345.399-.585.755-.591.355.007.665.246.755.591l.567,2.175h2.14c.43,0,.696.337.696.644Z" />
    </Svg>
  );
}

function RankingStarIcon({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="m20.5,16h-3.5v-3.5c0-1.93-1.57-3.5-3.5-3.5h-3c-1.93,0-3.5,1.57-3.5,3.5v.5h-3.5c-1.93,0-3.5,1.57-3.5,3.5v4c0,1.93,1.57,3.5,3.5,3.5h17c1.93,0,3.5-1.57,3.5-3.5v-1c0-1.93-1.57-3.5-3.5-3.5Zm-11.5-3.5c0-.827.673-1.5,1.5-1.5h3c.827,0,1.5.673,1.5,1.5v9.5h-6v-9.5Zm-7,8v-4c0-.827.673-1.5,1.5-1.5h3.5v7h-3.5c-.827,0-1.5-.673-1.5-1.5Zm20,0c0,.827-.673,1.5-1.5,1.5h-3.5v-4h3.5c.827,0,1.5.673,1.5,1.5v1ZM8.041,2.857c.096-.262.346-.437.626-.437h2.001l.708-1.987c.097-.261.346-.434.625-.434s.528.173.625.434l.708,1.987h2.001c.28,0,.53.175.626.438s.017.558-.197.739l-1.577,1.285.652,1.987c.089.269-.001.565-.226.738-.225.173-.534.185-.771.031l-1.836-1.196-1.805,1.208c-.112.075-.242.113-.371.113-.141,0-.282-.045-.4-.133-.227-.17-.321-.464-.236-.734l.627-2.011-1.585-1.29c-.213-.181-.291-.476-.194-.738Z" />
    </Svg>
  );
}

function GameRulesIcon({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="m22.714 15.657c-.409-1.365-1.38-2.25-2.714-2.542.052-.591-.399-1.119-1-1.115-.552 0-1 .447-1 1h-4c0-.553-.448-1-1-1-.601-.003-1.052.525-1 1.116-1.334.293-2.306 1.18-2.72 2.564-.967 2.856-1.28 5.331-1.28 6.082 0 1.234 1.004 2.238 2.238 2.238 1.639 0 3.517-2.111 4.281-3.228.331-.483.885-.772 1.481-.772s1.15.289 1.481.771c.764 1.117 2.642 3.229 4.281 3.229 1.234 0 2.238-1.004 2.238-2.238 0-.751-.313-3.226-1.286-6.104zm-.951 6.343c-.368-.014-1.646-.918-2.631-2.358-.705-1.027-1.875-1.642-3.131-1.642s-2.427.614-3.131 1.643c-.985 1.439-2.264 2.344-2.63 2.357-.131 0-.238-.106-.238-.238 0-.526.278-2.794 1.202-5.53.158-.528.517-1.231 1.798-1.231h6c1.281 0 1.64.703 1.826 1.32.896 2.647 1.174 4.915 1.174 5.441 0 .132-.107.238-.237.238zm-7.763-17c.552 0 1 .447 1 1s-.448 1-1 1h-8c-.552 0-1-.447-1-1s.448-1 1-1zm-5 6h-3c-.552 0-1-.447-1-1s.448-1 1-1h3c.552 0 1 .447 1 1s-.448 1-1 1zm-3 12c0 .553-.448 1-1 1-2.757 0-5-2.243-5-5v-14c0-2.757 2.243-5 5-5h10c2.757 0 5 2.243 5 5v4c0 .553-.448 1-1 1s-1-.447-1-1v-4c0-1.654-1.346-3-3-3h-10c-1.654 0-3 1.346-3 3v14c0 1.654 1.346 3 3 3 .552 0 1 .447 1 1z" />
    </Svg>
  );
}

function PlayCircleIconSvg({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="m16.395,10.122l-5.192-2.843c-.673-.379-1.473-.372-2.138.017-.667.39-1.064,1.083-1.064,1.855v5.699c0,.772.397,1.465,1.064,1.855.34.199.714.297,1.087.297.358,0,.716-.091,1.041-.274l5.212-2.854c.687-.386,1.096-1.086,1.096-1.873s-.409-1.487-1.105-1.878Zm-.961,2.003l-5.212,2.855c-.019.01-.077.042-.147-.001-.074-.043-.074-.107-.074-.128v-5.699c0-.021,0-.085.074-.128.027-.016.052-.021.074-.021.036,0,.065.016.083.026l5.192,2.844c.019.011.076.043.076.13s-.058.119-.066.125ZM12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm0,22c-5.514,0-10-4.486-10-10S6.486,2,12,2s10,4.486,10,10-4.486,10-10,10Z" />
    </Svg>
  );
}

function UserIconSvg({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <G id="_01_align_center" data-name="01 align center">
        <Path d="M21,24H19V18.957A2.96,2.96,0,0,0,16.043,16H7.957A2.96,2.96,0,0,0,5,18.957V24H3V18.957A4.963,4.963,0,0,1,7.957,14h8.086A4.963,4.963,0,0,1,21,18.957Z" />
        <Path d="M12,12a6,6,0,1,1,6-6A6.006,6.006,0,0,1,12,12ZM12,2a4,4,0,1,0,4,4A4,4,0,0,0,12,2Z" />
      </G>
    </Svg>
  );
}

function NightModeIcon({ size = 24, color = "#000" }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="M12,24a1,1,0,0,1-1-1V18.921a6.829,6.829,0,0,1-1.623-.435L7.33,22.007A1,1,0,0,1,5.6,21l2.049-3.525a7.092,7.092,0,0,1-1.128-1.13L3.01,18.391A1,1,0,0,1,2,16.662l3.51-2.043A6.922,6.922,0,0,1,5.072,13H1a1,1,0,0,1,0-2H5.072a6.922,6.922,0,0,1,.445-1.626L2,7.326A1,1,0,0,1,3,5.6L6.528,7.649A7.137,7.137,0,0,1,7.671,6.507L5.627,2.992A1,1,0,1,1,7.355,1.986L9.4,5.5a6.9,6.9,0,0,1,1.609-.431L11,1a1,1,0,0,1,2,0V5.079A2,2,0,0,1,11.29,7.05,5.019,5.019,0,0,0,7,12c0,3.538,3.728,4.87,4.289,4.95A2,2,0,0,1,13,18.921V23A1,1,0,0,1,12,24Zm6-6c-7.929-.252-7.928-11.749,0-12C25.929,6.252,25.928,17.749,18,18ZM18,8c-5.275.138-5.274,7.863,0,8C23.275,15.862,23.274,8.137,18,8Z" />
    </Svg>
  );
}

const { width, height } = Dimensions.get("window");
const scale = Math.max(0.58, Math.min(1.0, Math.min(width / 390, height / 844)));

export default function HomeScreen({ navigation }) {
  const { theme, toggleTheme, colors, typography } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const characterPulseAnim = useRef(new Animated.Value(1)).current;

  const [stats, setStats] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [gamingName, setGamingName] = useState("");

  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [hasCheckedDailyReward, setHasCheckedDailyReward] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasAutoNavigated = useRef(false);

  // Start Game CTA micro-interaction values
  const startBtnScale = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const pressIn = (animVal, to = 0.96) => {
    Animated.spring(animVal, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = (animVal) => {
    Animated.spring(animVal, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  // Pulse animation for the Daily Reward chest
  useEffect(() => {
    let anim;
    if (showDailyPopup) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1200,
            easing: Easing.easeInOut,
            useNativeDriver: true,
          })
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [showDailyPopup]);

  // Check if daily reward is claimable on app open (after stats are loaded and name modal is settled)
  useEffect(() => {
    if (stats && !showNameModal && !hasCheckedDailyReward) {
      const lastClaimed = stats.lastDailyRewardClaimed || 0;
      const isClaimable = Date.now() - lastClaimed >= 24 * 60 * 60 * 1000;
      if (isClaimable) {
        setShowDailyPopup(true);
      }
      setHasCheckedDailyReward(true);
    }
  }, [stats, showNameModal, hasCheckedDailyReward]);

  const handleOpenDailyReward = () => {
    setShowDailyPopup(false);
    navigation.navigate("DailyReward");
  };

  useEffect(() => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;

    const loadStats = () => {
      getMyStats().then((data) => {
        setStats(data);
        const lastClaimed = data.lastDailyRewardClaimed || 0;
        const isClaimable = Date.now() - lastClaimed >= 24 * 60 * 60 * 1000;
        const points = data.highScore || 0;

        // Direct instant navigation if 0 points and daily reward is claimable
        if (points === 0 && isClaimable && !hasAutoNavigated.current) {
          hasAutoNavigated.current = true;
          setHasCheckedDailyReward(true);
          navigation.navigate("DailyReward");
          return;
        }

        if (!data.playerName) {
          setGamingName(auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Player");
          setShowNameModal(true);
        } else {
          setShowNameModal(false);
        }
      });
    };

    loadStats();
    const unsub = navigation.addListener("focus", loadStats);
    return unsub;
  }, []);

  // Request notifications permission on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);




  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000, // Smooth 20s rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(characterPulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(characterPulseAnim, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // CTA shimmer sweep
    Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spinOuter = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const spinOuterInverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const spinMiddle = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"], // Counter-clockwise
  });
  const spinMiddleInverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-360deg", "0deg"],
  });

  const spinInner = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const spinInnerInverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.7, width * 0.7],
  });

  const outerItems = [
    { source: require("../../assets/new-img/Goal Achievement - blue_glass - target with trophy - small.png"), color: "#FBBF24", itemSize: Math.round(64 * scale) },
    { source: require("../../assets/new-img/Business Strategy - blue_glass - chess knight on paper plan - small.png"), color: "#3B82F6", itemSize: Math.round(64 * scale) },
    { source: require("../../assets/new-img/AI Analytics - blue_glass - brain with circuit lines - small.png"), color: "#06B6D4", itemSize: Math.round(64 * scale) },
    { source: require("../../assets/new-img/search.png"), color: "#10B981", itemSize: Math.round(64 * scale) },
  ];

  const middleItems = [
    { source: require("../../assets/new-img/Financial Milestone - blue_glass - flag on stacked coins - small.png"), color: "#10B981", itemSize: Math.round(64 * scale) },
    { source: require("../../assets/new-img/Employee Bonus 2 - blue_glass - gift box beside employee badge - small.png"), color: "#EC4899", itemSize: Math.round(64 * scale) },
  ];

  const innerItems = [
    // { source: require("../../assets/new-img/Accounting Ledger 2 - blue_glass - open ledger showing transaction columns - small.png"), color: "#8B5CF6", itemSize: Math.round(64 * scale) },
    // { source: require("../../assets/new-img/Wrap (2).png"), color: "#FBBF24", itemSize: Math.round(64 * scale) },
  ];

  const renderOrbitalRing = (radius, items, rotation, rotationInverse) => {
    const size = radius * 2;
    return (
      <Animated.View
        style={[
          styles.orbitalRingContainer,
          {
            width: size,
            height: size,
            borderRadius: radius,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {items.map((item, index) => {
          const angle = (index * 2 * Math.PI) / items.length - Math.PI / 2;
          const x = radius + radius * Math.cos(angle);
          const y = radius + radius * Math.sin(angle);
          const itemSize = item.itemSize;

          return (
            <Animated.View
              key={index}
              style={[
                styles.orbitalItemWrap,
                {
                  left: x - itemSize / 2,
                  top: y - itemSize / 2,
                  width: itemSize,
                  height: itemSize,
                  transform: [{ rotate: rotationInverse }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconBubble,
                  {
                    backgroundColor: item.source ? "transparent" : colors.surface,
                    borderColor: item.source ? "transparent" : colors.border,
                    borderRadius: itemSize / 2,
                    shadowColor: item.color,
                    shadowOpacity: item.source ? 0.35 : 0.15,
                    shadowRadius: item.source ? 8 : 5,
                    elevation: item.source ? 0 : 3,
                  },
                ]}
              >
                {item.source ? (
                  <Image
                    source={item.source}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={item.name} size={item.size} color={item.color} />
                )}
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={colors.gradientBg}
      locations={[0, 0.4, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>

        <View style={[styles.navBar, { borderBottomColor: colors.border, backgroundColor: "transparent" }]}>
          <View style={styles.navBrand}>
            <Image
              source={colors.isDark ? require("../../assets/elancelogolight.png") : require("../../assets/elancefulllogo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerRight}>
            {/* Clickable Score Pill */}
            <TouchableOpacity
              onPress={() => navigation.navigate("CoinHistory")}
              activeOpacity={0.8}
              style={[styles.tokenPill, { backgroundColor: colors.isDark ? "rgba(20,101,241,0.15)" : colors.primaryLight, borderColor: colors.isDark ? "rgba(20,101,241,0.6)" : "rgba(20,101,241,0.4)", marginRight: 4 }]}
            >
              <Ionicons name="trophy" size={13} color="#FBBF24" />
              <Text style={[styles.tokenText, { fontFamily: "", color: colors.primary, fontSize: 13 }]}>
                {stats?.highScore ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0 }]} activeOpacity={0.8}>
              <NightModeIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={[styles.themeBtn, { backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0 }]} activeOpacity={0.8}>
              <UserIconSvg size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainContentContainer}>
          <Animated.View style={{ opacity: fadeIn, flex: 1, width: "100%", justifyContent: "space-between", alignItems: "center" }}>

            <View style={styles.topGroup}>

              <View style={styles.titleBlock}>
                <Text style={[styles.mainTitle, typography.h1, { color: colors.textPrimary, fontSize: Math.round(32 * scale) }]}>IMPOSTER</Text>
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { borderColor: colors.isDark ? "rgba(0, 185, 111, 0.25)" : "rgba(0, 185, 111, 0.15)", backgroundColor: colors.isDark ? "rgba(0, 185, 111, 0.15)" : "rgba(0, 185, 111, 0.08)" }]}>
                    <Ionicons name="school-outline" size={10} color={colors.success} />
                    <Text style={[styles.tagText, { fontFamily: "Outfit-ExtraBold", color: colors.success, fontSize: 11 }]}>ACCA • CMA REVISION</Text>
                  </View>
                </View>
              </View>

              <View style={styles.orbitalWrap}>

                <View style={[styles.orbitTrack, { width: 360 * scale, height: 360 * scale, borderRadius: 180 * scale, borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.06)" }]} />
                <View style={[styles.orbitTrack, { width: 265 * scale, height: 265 * scale, borderRadius: 132.5 * scale, borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.06)" }]} />
                <View style={[styles.orbitTrack, { width: 170 * scale, height: 170 * scale, borderRadius: 85 * scale, borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.06)" }]} />

                {renderOrbitalRing(180 * scale, outerItems, spinOuter, spinOuterInverse)}
                {renderOrbitalRing(132.5 * scale, middleItems, spinMiddle, spinMiddleInverse)}
                {renderOrbitalRing(85 * scale, innerItems, spinInner, spinInnerInverse)}

                <Animated.Image
                  source={require("../../assets/crazyboy.png")}
                  style={{
                    position: "absolute",
                    width: 420 * scale,
                    height: 420 * scale,
                    resizeMode: "contain",
                    marginTop: 5 * scale,
                    transform: [{ scale: characterPulseAnim }],
                  }}
                />
              </View>
            </View>

            <View style={styles.menuGroup}>
              <View style={styles.cardsSection}>
                <Animated.View
                  style={[
                    styles.ctaGlowWrap,
                    {
                      shadowColor: colors.playBtnBorder,
                      shadowOpacity: colors.isDark ? 0.55 : 0.4,
                      transform: [{ scale: startBtnScale }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate("GameMode")}
                    onPressIn={() => pressIn(startBtnScale, 0.97)}
                    onPressOut={() => pressOut(startBtnScale)}
                    activeOpacity={0.94}
                    style={[styles.modeCard, { borderWidth: 1.5, borderColor: colors.playBtnBorder, overflow: "hidden" }]}
                  >
                    <LinearGradient
                      colors={colors.gradientPlayBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: "100%" }}
                    >
                      {/* Glass highlight sheen across the top half */}
                      <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
                        style={styles.ctaSheen}
                      />

                      {/* Animated shimmer sweep */}
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.ctaShimmer, { transform: [{ translateX: shimmerTranslate }, { rotate: "20deg" }] }]}
                      >
                        <LinearGradient
                          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </Animated.View>

                      <View style={[styles.modeCardBody, { justifyContent: "center", gap: 10 }]}>
                        <PlayCircleIconSvg size={Math.round(22 * scale)} color={colors.playBtnText} />
                        <Text style={[
                          styles.modeTitle,
                          typography.btnPlay,
                          {
                            color: colors.playBtnText,
                            fontSize: Math.round(typography.btnPlay.fontSize * scale),
                            textAlign: "center",
                            marginBottom: 0,
                            textShadowColor: "rgba(0,0,0,0.25)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }
                        ]}>
                          Start Game
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={styles.statsStrip}>
                {[
                  { icon: "gift-outline", label: "Daily Reward", color: colors.warning },
                  { icon: "information-circle-outline", label: "Game Rules", color: colors.success },
                  { icon: "ribbon-outline", label: "Top Rank", color: colors.primary },
                ].map(({ icon, label, color }) => {
                  const isTopRank = label === "Top Rank";
                  const isDailyReward = label === "Daily Reward";
                  const isGameRules = label === "Game Rules";
                  const CardComponent = (isTopRank || isDailyReward || isGameRules) ? TouchableOpacity : View;

                  const getPressAction = () => {
                    if (isTopRank) return () => navigation.navigate("GlobalRanking");
                    if (isDailyReward) return () => navigation.navigate("DailyReward");
                    if (isGameRules) return () => navigation.navigate("GameRules");
                    return undefined;
                  };

                  return (
                    <CardComponent
                      key={label}
                      onPress={getPressAction()}
                      activeOpacity={(isTopRank || isDailyReward || isGameRules) ? 0.8 : undefined}
                      style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={styles.statIcon}>
                        {isDailyReward ? (
                          <MedalIcon size={Math.round(20 * scale)} color="#0959ee" />
                        ) : isGameRules ? (
                          <GameRulesIcon size={Math.round(20 * scale)} color="#0959ee" />
                        ) : isTopRank ? (
                          <RankingStarIcon size={Math.round(20 * scale)} color={color} />
                        ) : (
                          <Ionicons name={icon} size={Math.round(20 * scale)} color={color} />
                        )}
                      </View>
                      <Text style={[styles.statLabel, typography.sub8, { color: colors.textSecondary }]}>{label}</Text>
                    </CardComponent>
                  );
                })}
              </View>
            </View>

            <View style={styles.footerRow}>
              <Ionicons name="book-outline" size={Math.round(12 * scale)} color={colors.textDisabled} />
              <Text style={[styles.footerText, typography.sub2, { color: colors.textSecondary }]}>Study • Play • Compete</Text>
              <Ionicons name="book-outline" size={Math.round(12 * scale)} color={colors.textDisabled} />
            </View>
          </Animated.View>
        </View>
        {/* Gaming Name Setup Modal */}

        <Modal
          visible={showNameModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { }} // Non-dismissable
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 320 }]}>
                  {/* Header */}
                  <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.modalIconBox, { backgroundColor: colors.isDark ? "rgba(139,92,246,0.15)" : "#F5F3FF" }]}>
                        <Ionicons name="game-controller" size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[typography.h4, { color: colors.textPrimary, fontWeight: "bold" }]}>Choose Gaming Tag</Text>
                        <Text style={[typography.body3, { color: colors.textSecondary }]}>Set your display name</Text>
                      </View>
                    </View>
                  </View>



                  {/* Form Content */}
                  <View style={{ padding: 20, gap: 16 }}>
                    <Text style={[typography.body3, { color: colors.textSecondary }]}>
                      Please choose a gaming name before you play. Other players will see this name.
                    </Text>

                    <View style={{ width: "100%", marginBottom: 16 }}>
                      <TextInput
                        value={gamingName}
                        onChangeText={setGamingName}
                        placeholder="Enter gaming tag..."
                        placeholderTextColor={colors.textDisabled}
                        maxLength={18}
                        style={[
                          typography.body1,
                          {
                            backgroundColor: colors.isDark ? "#000000" : "#F8FAFC",
                            borderColor: colors.border,
                            color: colors.textPrimary,
                            height: 48,
                            borderWidth: 1,
                            borderRadius: 10,
                            paddingHorizontal: 16,
                          }
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={async () => {
                        const cleanName = gamingName.trim();
                        if (!cleanName) {
                          Alert.alert("Input Required", "Please enter a valid gaming name.");
                          return;
                        }
                        try {
                          const myUid = auth.currentUser?.uid;
                          if (!myUid) return;

                          const updated = await updateMyProfile(cleanName);
                          setStats(updated);

                          setShowNameModal(false);
                        } catch (e) {
                          Alert.alert("Error", `Failed to save name: ${e.message}`);
                        }
                      }}
                      style={{ backgroundColor: colors.primary, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" }}
                      activeOpacity={0.8}
                    >
                      <Text style={[typography.btn1, { color: "#FFF", fontWeight: "bold" }]}>SAVE AND CONTINUE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Daily Reward claimable popup */}
        <Modal
          visible={showDailyPopup}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDailyPopup(false)}
        >
          <View style={styles.dailyModalOverlay}>
            <View style={[styles.dailyModalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Header with Close Button */}
              <View style={styles.dailyModalHeader}>
                <Text style={[typography.sub8, { color: colors.textSecondary, letterSpacing: 1.5 }]}>SPECIAL EVENT</Text>
                <TouchableOpacity
                  onPress={() => setShowDailyPopup(false)}
                  style={[styles.dailyCloseBtn, { backgroundColor: colors.isDark ? "#1E1E1E" : "#F1F5F9", borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Glowing animated chest icon */}
              <View style={styles.dailyChestContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleOpenDailyReward}
                    style={[
                      styles.dailyChestCircle,
                      {
                        borderColor: "#F59E0B",
                        backgroundColor: colors.isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)",
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={["#FCD34D", "#F59E0B"]}
                      style={styles.dailyInnerChestCircle}
                    >
                      <MedalIcon
                        size={48}
                        color="#FFFFFF"
                      />
                    </LinearGradient>

                    {/* Glowing ring */}
                    <View style={styles.dailyGlowRing} />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Title & Description */}
              <View style={styles.dailyTextSection}>
                <View style={styles.dailyTitleRow}>
                  <Ionicons name="sparkles" size={20} color="#FBBF24" />
                  <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: "900", marginLeft: 6 }]}>
                    Daily Reward!
                  </Text>
                </View>
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 18 }]}>
                  Your daily treasure chest is ready to unlock. Claim your free coins now!
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.dailyActionSection}>
                <TouchableOpacity
                  onPress={handleOpenDailyReward}
                  style={styles.dailyClaimBtnWrap}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#FBBF24", "#F59E0B"]}
                    style={styles.dailyClaimBtn}
                  >
                    <Ionicons name="gift" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[typography.btn1, { color: "#FFFFFF", fontWeight: "bold" }]}>
                      CLAIM REWARD
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDailyPopup(false)}
                  style={styles.dailySecondaryBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.body3, { color: colors.textSecondary, fontWeight: "600" }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const RING_SIZE = 136;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  /* Nav */
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: Math.max(10, Math.round(height * 0.016)),
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandIcon: {
    width: 20,
    height: 20,
  },
  brandText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#0F172A",
  },
  logoImage: {
    width: 90,
    height: 24,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Main Fixed Content Container */
  mainContentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Math.max(32, Math.round(height * 0.065)),
    paddingTop: Math.max(10, Math.round(height * 0.015)),
  },
  topGroup: {
    width: "100%",
    alignItems: "center",
  },
  menuGroup: {
    width: "100%",
    gap: Math.max(8, Math.round(height * 0.012)),
  },

  /* Orbital Animation */
  orbitalWrap: {
    width: Math.round(400 * scale),
    height: Math.round(400 * scale),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  orbitTrack: {
    position: "absolute",
    borderWidth: 1.2,
    borderColor: "rgba(37,99,235,0.06)",
  },
  orbitalRingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  orbitalItemWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBubble: {
    width: "100%",
    height: "100%",
    borderRadius: Math.round(32 * scale),
    borderWidth: 1.2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  orbitalImageAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: Math.round(32 * scale),
  },
  iconBubble: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  radarCenter: {
    width: Math.round(40 * scale),
    height: Math.round(40 * scale),
    borderRadius: Math.round(20 * scale),
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  logoNodeContainer: {
    width: Math.round(40 * scale),
    height: Math.round(40 * scale),
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  logoNodeMain: {
    width: Math.round(18 * scale),
    height: Math.round(18 * scale),
    borderRadius: Math.round(9 * scale),
    backgroundColor: "#FFFFFF",
  },
  logoNodeSub1: {
    width: Math.round(11 * scale),
    height: Math.round(11 * scale),
    borderRadius: Math.round(5.5 * scale),
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: Math.round(4 * scale),
    right: Math.round(4 * scale),
  },
  logoNodeSub2: {
    width: Math.round(7 * scale),
    height: Math.round(7 * scale),
    borderRadius: Math.round(3.5 * scale),
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: Math.round(-1 * scale),
    right: Math.round(-1 * scale),
  },

  /* Title */
  titleBlock: { alignItems: "center", marginBottom: Math.round(14 * scale) },
  mainTitle: {
    fontSize: Math.round(40 * scale),
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 6,
  },
  tagRow: { marginTop: Math.round(12 * scale), flexDirection: "row", gap: Math.round(8 * scale), alignItems: "center" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.round(6 * scale),
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    borderRadius: Math.round(20 * scale),
    paddingVertical: Math.round(4 * scale),
    paddingHorizontal: Math.round(10 * scale),
    backgroundColor: "#EFF6FF",
  },
  tagText: {
    fontSize: Math.round(9 * scale),
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.round(5 * scale),
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
    borderRadius: Math.round(20 * scale),
    paddingVertical: Math.round(4 * scale),
    paddingHorizontal: Math.round(10 * scale),
  },
  liveDot: {
    width: Math.round(7 * scale),
    height: Math.round(7 * scale),
    borderRadius: Math.round(3.5 * scale),
    backgroundColor: "#10B981",
  },
  liveText: { fontSize: Math.round(9 * scale), color: "#059669", fontWeight: "600" },


  cardsSection: { width: "100%", gap: Math.round(8 * scale) },
  ctaGlowWrap: {
    width: "100%",
    borderRadius: Math.round(12 * scale),
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  ctaSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  ctaShimmer: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 70,
  },
  modeCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: Math.round(12 * scale),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  modeCardBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: Math.round(16 * scale),
    gap: Math.round(12 * scale),
  },
  modeIconBox: {
    width: Math.round(48 * scale),
    height: Math.round(48 * scale),
    borderRadius: Math.round(12 * scale),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  modeIconViolet: {
    backgroundColor: "#EFF6FF",
    borderColor: "rgba(37,99,235,0.15)",
  },
  modeIconEmerald: {
    backgroundColor: "#ECFDF5",
    borderColor: "rgba(16,185,129,0.15)",
  },
  modeTextWrap: { flex: 1 },
  modeTitle: {
    fontSize: Math.round(18 * scale),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
    marginBottom: Math.round(2 * scale),
  },
  modeSub: {
    fontSize: Math.round(11 * scale),
    color: "#64748B",
    lineHeight: Math.round(16 * scale),
  },
  modeArrow: {
    width: Math.round(28 * scale),
    height: Math.round(28 * scale),
    borderRadius: Math.round(14 * scale),
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  modeArrowEmerald: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },


  statsStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: Math.round(8 * scale),
    marginTop: 0
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: Math.round(12 * scale),
    paddingVertical: Math.round(16 * scale),
    gap: Math.round(6 * scale),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  statIcon: {
    width: Math.round(32 * scale),
    height: Math.round(32 * scale),
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: {
    fontSize: Math.round(9 * scale),
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },

  /* Footer */
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.round(8 * scale),
    marginTop: Math.max(14, Math.round(height * 0.02)),
  },
  footerText: {
    fontSize: Math.round(11 * scale),
    color: "#94A3B8",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  scoreCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  scoreCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scoreStatsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 12,
  },
  scoreStatBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  historySection: {
    width: "100%",
    marginTop: 6,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tokenRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  tokenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  tokenText: {
    fontSize: 11,
  },
  liveCameraWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 6,
    width: 34,
    height: 34,
  },
  liveCameraCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  liveCameraBadge: {
    position: "absolute",
    bottom: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveCameraBadgeText: {
    color: "#FFFFFF",
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderWidth: 1,
    height: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceSection: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
  },
  historyList: {
    flex: 1,
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
  /* Daily Reward Modal Styles */
  dailyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dailyModalContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  dailyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  dailyCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dailyChestContainer: {
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  dailyChestCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dailyInnerChestCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: "center",
    alignItems: "center",
  },
  dailyGlowRing: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.35)",
    borderStyle: "dashed",
  },
  dailyTextSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  dailyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyActionSection: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  dailyClaimBtnWrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  dailyClaimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  dailySecondaryBtn: {
    paddingVertical: 6,
  },
});

