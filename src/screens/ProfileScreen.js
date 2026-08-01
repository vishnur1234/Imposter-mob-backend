import React, { useState, useEffect } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from "../services/authService";
import { getMyStats, updateMyProfile } from "../services/statsService";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function ProfileScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const myUid = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email || "No Email";

  useEffect(() => {
    if (!myUid) {
      setLoading(false);
      return;
    }

    getMyStats()
      .then((data) => {
        setStats(data);
        setPlayerName(data.playerName || userEmail.split("@")[0]);
      })
      .catch(() => setPlayerName(userEmail.split("@")[0]))
      .finally(() => setLoading(false));
  }, [myUid]);

  const handleSave = async () => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      Alert.alert("Error", "Please enter a valid gaming name.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(cleanName);
      setStats(updated);

      Alert.alert("Success", "Gaming name updated successfully!");
    } catch (e) {
      Alert.alert("Error", `Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.log(e);
              Alert.alert("Error", `Failed to logout: ${e.message}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Generate initials for avatar
  const initials = playerName
    ? playerName.substring(0, 2).toUpperCase()
    : userEmail.substring(0, 2).toUpperCase();

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
          <Text style={[styles.headerTitle, typography.sub2, { color: colors.textPrimary }]}>PROFILE</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Avatar & Header details card */}
            <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LinearGradient
                colors={colors.isDark ? ["#4C1D95", "#8B5CF6"] : ["#8B5CF6", "#C084FC"]}
                style={styles.avatarPill}
              >
                <Text style={[styles.avatarText, typography.h2]}>{initials}</Text>
              </LinearGradient>

              <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: "900", marginTop: 14 }]}>
                {stats?.playerName || userEmail.split("@")[0]}
              </Text>
              <Text style={[typography.body3, { color: colors.textSecondary, marginTop: 4 }]}>
                {userEmail}
              </Text>
            </View>

            {/* Statistics Row Grid */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy" size={24} color="#FBBF24" />
                <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: "900", marginTop: 8 }]}>
                  {stats?.highScore ?? 0}
                </Text>
                <Text style={[typography.sub8, { color: colors.textSecondary, marginTop: 2 }]}>COINS BALANCE</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="game-controller-outline" size={24} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: "900", marginTop: 8 }]}>
                  {stats?.totalMatches ?? 0}
                </Text>
                <Text style={[typography.sub8, { color: colors.textSecondary, marginTop: 2 }]}>MATCHES PLAYED</Text>
              </View>
            </View>

            {/* Setup Gaming Name Box */}
            <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.sub3, { color: colors.primary, marginBottom: 12 }]}>
                GAMING NAME SETUP
              </Text>
              <Text style={[typography.body3, { color: colors.textSecondary, marginBottom: 16 }]}>
                Choose a unique gaming tag that other players will see when you host or join game lobbies.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Enter gaming tag..."
                  placeholderTextColor={colors.textDisabled}
                  maxLength={18}
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
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.saveBtnText, typography.btn1]}>SAVE GAMING TAG</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: colors.isDark ? "rgba(239, 68, 68, 0.08)" : "#FEF2F2",
                  borderColor: colors.isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                }
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={18} color="#EF4444" />
              <Text style={[styles.logoutBtnText, typography.btn1, { color: "#EF4444" }]}>LOGOUT</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

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

  profileCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
  },
  avatarPill: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: { color: "#FFF", fontWeight: "900", letterSpacing: 1.5 },

  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
  },

  settingsCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", letterSpacing: 1 },
  logoutBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    width: "100%",
    borderWidth: 1,
  },
  logoutBtnText: { fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase" },
});
