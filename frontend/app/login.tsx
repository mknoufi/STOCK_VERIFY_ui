/**
 * Modern Login Screen - Lavanya Mart Stock Verify
 * Clean, accessible login with modern design
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useAuthStore } from "../src/store/authStore";
import ModernButton from "../src/components/ui/ModernButton";
import ModernCard from "../src/components/ui/ModernCard";
import ModernInput from "../src/components/ui/ModernInput";
import ModernHeader from "../src/components/ui/ModernHeader";
import { colors, spacing, typography, borderRadius, shadows } from "../src/theme/modernDesign";

type LoginMode = "pin" | "credentials";

export default function LoginScreen() {
  const { login, loginWithPin, isLoading } = useAuthStore();
  const [loginMode, setLoginMode] = useState<LoginMode>("pin");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    pin?: string;
    username?: string;
    password?: string;
  }>({});

  const handlePinPress = useCallback(
    async (digit: string) => {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Auto-login when 4 digits entered
        if (newPin.length === 4) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          try {
            const result = await loginWithPin(newPin);
            if (!result.success) {
              Alert.alert("Login Failed", result.message || "Invalid PIN");
              setPin("");
            }
          } catch (_error) {
            Alert.alert("Login Failed", "Please check your PIN and try again.");
            setPin("");
          }
        }
      }
    },
    [pin, loginWithPin]
  );

  const handlePinDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleLogin = useCallback(async () => {
    const newErrors: { pin?: string; username?: string; password?: string } = {};
    setErrors(newErrors);
    try {
      if (loginMode === "pin") {
        if (pin.length !== 4) {
          setErrors({ pin: "Please enter a 4-digit PIN" });
          return;
        }
        const result = await loginWithPin(pin);
        if (!result.success) {
          Alert.alert("Login Failed", result.message || "Invalid PIN");
          setPin("");
        }
      } else {
        if (!username.trim()) {
          setErrors({ username: "Username is required" });
          return;
        }
        if (!password.trim()) {
          setErrors({ password: "Password is required" });
          return;
        }
        const result = await login(username, password);
        if (!result.success) {
          Alert.alert("Login Failed", result.message || "Invalid credentials");
        }
      }
    } catch (_error) {
      Alert.alert("Login Failed", "Please check your credentials and try again.");
    }
  }, [loginMode, pin, username, password, login, loginWithPin]);

  const toggleLoginMode = useCallback(() => {
    const newMode: LoginMode = loginMode === "pin" ? "credentials" : "pin";
    setLoginMode(newMode);
    setPin("");
    setUsername("");
    setPassword("");
    const newErrors: { pin?: string; username?: string; password?: string } = {};
    setErrors(newErrors);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [loginMode]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={colors.white} />

      <ModernHeader showLogo title="Lavanya Mart" subtitle="Stock Verification System" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Welcome Section */}
            <Animated.View
              entering={FadeInUp.duration(800).springify()}
              style={styles.welcomeSection}
            >
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to access your inventory management system
              </Text>
            </Animated.View>

            {/* Login Form Card */}
            <Animated.View
              entering={FadeInDown.duration(800).springify()}
              style={styles.formContainer}
            >
              <ModernCard style={styles.loginCard} padding="lg">
                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    onPress={toggleLoginMode}
                    style={[
                      styles.modeButton,
                      loginMode === "pin" ? styles.modeButtonActive : styles.modeButtonInactive,
                    ]}
                  >
                    <Ionicons
                      name="keypad"
                      size={20}
                      color={loginMode === "pin" ? colors.white : colors.gray[600]}
                    />
                    <Text
                      style={[
                        styles.modeButtonText,
                        loginMode === "pin"
                          ? styles.modeButtonTextActive
                          : styles.modeButtonTextInactive,
                      ]}
                    >
                      PIN
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleLoginMode}
                    style={[
                      styles.modeButton,
                      loginMode === "credentials"
                        ? styles.modeButtonActive
                        : styles.modeButtonInactive,
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={loginMode === "credentials" ? colors.white : colors.gray[600]}
                    />
                    <Text
                      style={[
                        styles.modeButtonText,
                        loginMode === "credentials"
                          ? styles.modeButtonTextActive
                          : styles.modeButtonTextInactive,
                      ]}
                    >
                      Credentials
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* PIN Entry Mode */}
                {loginMode === "pin" && (
                  <>
                    <Text style={styles.formTitle}>Enter Your PIN</Text>

                    {/* PIN Display */}
                    <View style={styles.pinDisplay}>
                      {[0, 1, 2, 3].map((index) => (
                        <View
                          key={index}
                          style={[
                            styles.pinDot,
                            pin.length > index ? styles.pinDotFilled : styles.pinDotEmpty,
                          ]}
                        />
                      ))}
                    </View>

                    {/* Numeric Keypad */}
                    <View style={styles.keypad}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <TouchableOpacity
                          key={digit}
                          onPress={() => handlePinPress(digit.toString())}
                          style={styles.keypadButton}
                        >
                          <Text style={styles.keypadButtonText}>{digit}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        onPress={() => handlePinPress("0")}
                        style={[styles.keypadButton, styles.keypadButtonZero]}
                      >
                        <Text style={styles.keypadButtonText}>0</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handlePinDelete}
                        style={[styles.keypadButton, styles.keypadButtonDelete]}
                      >
                        <Ionicons name="backspace" size={24} color={colors.gray[600]} />
                      </TouchableOpacity>
                    </View>

                    {errors.pin && <Text style={styles.errorText}>{errors.pin}</Text>}
                  </>
                )}

                {/* Credentials Entry Mode */}
                {loginMode === "credentials" && (
                  <>
                    <Text style={styles.formTitle}>Sign In</Text>

                    <ModernInput
                      label="Username"
                      placeholder="Enter your username"
                      value={username}
                      onChangeText={setUsername}
                      error={errors.username}
                      autoCapitalize="none"
                      icon="person"
                    />

                    <ModernInput
                      label="Password"
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      error={errors.password}
                      secureTextEntry
                      icon="lock-closed"
                    />
                  </>
                )}

                {/* Login Button */}
                <ModernButton
                  title={isLoading ? "Signing In..." : "Sign In"}
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={
                    isLoading || (loginMode === "pin" ? pin.length !== 4 : !username || !password)
                  }
                  fullWidth
                  style={styles.loginButton}
                  icon="log-in"
                />
              </ModernCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(800).springify()}
              style={styles.footer}
            >
              <Text style={styles.versionText}>Version 3.0.0</Text>
              <Text style={styles.footerText}>Secure • Reliable • Fast</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  welcomeTitle: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray[600],
    textAlign: "center",
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  loginCard: {
    backgroundColor: colors.white,
  },
  modeToggle: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: colors.primary[500],
    ...shadows.sm,
  },
  modeButtonInactive: {
    backgroundColor: colors.transparent,
  },
  modeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  modeButtonTextInactive: {
    color: colors.gray[600],
  },
  formTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  pinDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  pinDotEmpty: {
    borderColor: colors.gray[300],
    backgroundColor: colors.transparent,
  },
  pinDotFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  keypadButtonZero: {
    marginHorizontal: spacing.md,
  },
  keypadButtonDelete: {
    backgroundColor: colors.gray[200],
  },
  keypadButtonText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error[600],
    textAlign: "center",
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: "center",
    gap: spacing.xs,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[500],
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
  },
});
