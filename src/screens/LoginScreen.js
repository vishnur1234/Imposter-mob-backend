import React, { useState } from "react";
import {
  View, StyleSheet, Text, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logo}>
            <Ionicons name="eye" size={40} color={colors.primary} />
            <Text style={[styles.logoTitle, typography.h1, { color: colors.primary }]}>IMPOSTER</Text>
            <Text style={[styles.logoSub, typography.sub3, { color: colors.textSecondary }]}>ACCA & CMA Revision Game</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Email */}
            <Text style={[styles.label, typography.sub7, { color: colors.textSecondary }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, typography.body1, { color: colors.textPrimary }]}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, typography.sub7, { marginTop: 16, color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={[styles.input, typography.body1, { flex: 1, color: colors.textPrimary }]}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 10 }}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={styles.primaryBtnWrap}>
              <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                {loading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <>
                    <Ionicons name="log-in-outline" size={18} color="#FFF" />
                    <Text style={[styles.primaryBtnText, typography.btn1]}>Login</Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divRow}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.divLabel, typography.sub2, { color: colors.textDisabled }]}>OR</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Register */}
            <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.8} style={[styles.ghostBtn, { backgroundColor: colors.primaryLight, borderColor: colors.isDark ? "rgba(20,101,241,0.3)" : "rgba(37,99,235,0.15)" }]}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text style={[styles.ghostBtnText, typography.btn2, { color: colors.primary }]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, typography.sub2, { color: colors.textDisabled }]}>Study • Play • Compete</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },

  logo: { alignItems: "center", marginBottom: 32 },
  logoTitle: { fontSize: 42, fontWeight: "900", color: "#2563EB", letterSpacing: 5, marginTop: 10 },
  logoSub: { fontSize: 13, color: "#64748B", marginTop: 6, letterSpacing: 0.5 },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8, letterSpacing: 0.4 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#0F172A", fontSize: 15 },

  primaryBtnWrap: { borderRadius: 16, overflow: "hidden", marginTop: 24 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800", letterSpacing: 1 },

  divRow: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  divLabel: { fontSize: 11, color: "#94A3B8", letterSpacing: 1.5, fontWeight: "700" },

  ghostBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#EFF6FF",
    borderWidth: 1, borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 14, paddingVertical: 14,
  },
  ghostBtnText: { color: "#2563EB", fontSize: 15, fontWeight: "700" },

  footer: { textAlign: "center", marginTop: 28, fontSize: 11, color: "#94A3B8", letterSpacing: 2, textTransform: "uppercase" },
});
