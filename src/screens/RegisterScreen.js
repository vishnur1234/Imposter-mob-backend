import React, { useState } from "react";
import {
  View, StyleSheet, Text, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function RegisterScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
      Alert.alert("Success", "Account created!", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradientBg} locations={[0, 0.4, 1]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={[styles.backLabel, typography.btn2, { color: colors.primary }]}>Back to Login</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="person-add" size={38} color={colors.primary} />
            <Text style={[styles.title, typography.h2, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, typography.sub3, { color: colors.textSecondary }]}>Join the Imposter Game</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

            <Text style={[styles.label, typography.sub7, { marginTop: 16, color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.isDark ? "#000000" : "#F8FAFC", borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={[styles.input, typography.body1, { flex: 1, color: colors.textPrimary }]}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 10 }}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85} style={styles.primaryBtnWrap}>
              <LinearGradient colors={colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                {loading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                      <Text style={[styles.primaryBtnText, typography.btn1]}>Create Account</Text>
                    </>
                }
              </LinearGradient>
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

  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 24 },
  backLabel: { color: "#2563EB", fontSize: 13, fontWeight: "600" },

  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 30, fontWeight: "900", color: "#0F172A", letterSpacing: 1, marginTop: 12 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 6 },

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

  footer: { textAlign: "center", marginTop: 28, fontSize: 11, color: "#94A3B8", letterSpacing: 2, textTransform: "uppercase" },
});
