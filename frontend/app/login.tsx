/**
 * Login Screen - Aurora Design v2.0
 *
 * Features:
 * - Aurora gradient animated background
 * - Glassmorphism login card
 * - PIN keypad (primary for staff)
 * - Username/password (secondary for admin/supervisor)
 * - Remember me functionality
 * - Smooth animations
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { AuroraBackground, GlassCard } from "../src/components/ui";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernLayout,
} from "../src/styles/modernDesignSystem";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { PremiumInput } from "../src/components/premium/PremiumInput";
import { PremiumButton } from "../src/components/premium/PremiumButton";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const APP_VERSION = "2.3.0";
const PIN_LENGTH = 4;

type LoginMode = "pin" | "credentials";

const STORAGE_KEYS = {
  REMEMBERED_USERNAME: "remembered_username_v1",
  REMEMBER_ME_ENABLED: "remember_me_enabled_v1",
  PREFERRED_LOGIN_MODE: "preferred_login_mode_v1",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithPin } = useAuthStore();

  // Login mode state (PIN is primary/default)
  const [loginMode, setLoginMode] = useState<LoginMode>("pin");

  // PIN state
  const [pin, setPin] = useState("");

  // Credentials state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const logoScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(50);
  const pinShake = useSharedValue(0);

  // Load remembered username on mount
  useEffect(() => {
    const loadRememberedUser = async () => {
      try {
        const [savedUsername, rememberEnabled] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.REMEMBERED_USERNAME),
          AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME_ENABLED),
        ]);
        if (rememberEnabled === "true" && savedUsername) {
          setUsername(savedUsername);
          setRememberMe(true);
        }
      } catch {
        // Silently fail - not critical
      }
    };
    loadRememberedUser();
  }, []);

  useEffect(() => {
    // Logo entrance animation
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 80 });
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const pinIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pinShake.value }],
  }));

  // Shake animation for wrong PIN
  const triggerShake = useCallback(() => {
    pinShake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [pinShake]);

  // Handle PIN digit press
  const handlePinDigit = useCallback(
    (digit: string) => {
      if (loading || pin.length >= PIN_LENGTH) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === PIN_LENGTH) {
        handlePinLogin(newPin);
      }
    },
    [pin, loading],
  );

  // Handle PIN backspace
  const handlePinBackspace = useCallback(() => {
    if (loading || pin.length === 0) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setPin(pin.slice(0, -1));
  }, [pin, loading]);

  // Handle PIN login
  const handlePinLogin = async (pinValue: string) => {
    setLoading(true);
    try {
      const result = await loginWithPin(pinValue);
      if (!result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        triggerShake();
        setPin("");
        Alert.alert("Invalid PIN", result.message || "Please try again");
      }
    } catch {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      triggerShake();
      setPin("");
      Alert.alert("Login Failed", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Switch login mode
  const switchLoginMode = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoginMode(loginMode === "pin" ? "credentials" : "pin");
    setPin("");
  }, [loginMode]);

  const handleForgotPassword = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert(
      "Reset Password",
      "Please contact your administrator to reset your password.",
      [{ text: "OK", style: "default" }],
    );
  };

  const toggleRememberMe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRememberMe(!rememberMe);
  };

  const toggleShowPassword = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBERED_USERNAME, username);
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, "true");
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, "false");
      }

      const result = await login(username, password);
      // Success is handled by router based on auth state
      if (!result.success) {
        Alert.alert(
          "Login Failed",
          result.message || "Invalid username or password",
        );
      }
    } catch {
      Alert.alert("Login Failed", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[
          modernColors.background.default,
          modernColors.background.paper,
        ]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative background elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Logo & Brand Section */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[styles.header, logoStyle]}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name="cube"
                  size={56}
                  color={modernColors.primary[400]}
                />
                <View style={styles.iconGlow} />
              </View>
              <Text style={styles.title}>Stock Verify</Text>
              <Text style={styles.subtitle}>Inventory Management System</Text>
            </Animated.View>

            {/* Login Form Card */}
            <Animated.View
              entering={FadeInUp.delay(400).springify()}
              style={styles.formContainerWrapper}
            >
              <GlassCard
                variant="strong"
                intensity={40}
                borderRadius={modernBorderRadius.xl}
                padding={modernSpacing.xl}
                withGradientBorder={true}
                elevation="lg"
                style={styles.glassCard}
              >
                <View style={styles.form}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>
                      {loginMode === "pin" ? "Enter Your PIN" : "Welcome Back"}
                    </Text>
                    <Text style={styles.formSubtitle}>
                      {loginMode === "pin"
                        ? "Use your 4-digit PIN to sign in"
                        : "Sign in with your credentials"}
                    </Text>
                  </View>

                  {/* PIN Login Mode */}
                  {loginMode === "pin" ? (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(200)}
                      style={styles.pinContainer}
                    >
                      {/* PIN Indicator Dots */}
                      <Animated.View
                        style={[styles.pinIndicators, pinIndicatorStyle]}
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <View
                            key={index}
                            style={[
                              styles.pinDot,
                              pin.length > index && styles.pinDotFilled,
                            ]}
                          />
                        ))}
                      </Animated.View>

                      {/* PIN Keypad */}
                      <View style={styles.keypadContainer}>
                        {/* Row 1: 1, 2, 3 */}
                        <View style={styles.keypadRow}>
                          {["1", "2", "3"].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={styles.keypadButton}
                              onPress={() => handlePinDigit(digit)}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>{digit}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 2: 4, 5, 6 */}
                        <View style={styles.keypadRow}>
                          {["4", "5", "6"].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={styles.keypadButton}
                              onPress={() => handlePinDigit(digit)}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>{digit}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 3: 7, 8, 9 */}
                        <View style={styles.keypadRow}>
                          {["7", "8", "9"].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={styles.keypadButton}
                              onPress={() => handlePinDigit(digit)}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>{digit}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 4: Empty, 0, Backspace */}
                        <View style={styles.keypadRow}>
                          <View style={styles.keypadButtonEmpty} />
                          <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={() => handlePinDigit("0")}
                            disabled={loading}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.keypadText}>0</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={handlePinBackspace}
                            disabled={loading || pin.length === 0}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="backspace-outline"
                              size={24}
                              color={
                                pin.length === 0
                                  ? modernColors.text.tertiary
                                  : modernColors.text.primary
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {loading && (
                        <Text style={styles.loadingText}>Verifying PIN...</Text>
                      )}
                    </Animated.View>
                  ) : (
                    /* Credentials Login Mode */
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(200)}
                    >
                      <View style={styles.inputSection}>
                        <PremiumInput
                          label="Username"
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Enter your username"
                          autoCapitalize="none"
                          leftIcon="person-outline"
                          editable={!loading}
                        />

                        <PremiumInput
                          label="Password"
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          secureTextEntry
                          leftIcon="lock-closed-outline"
                          editable={!loading}
                          style={{ marginTop: 8 }}
                        />
                      </View>

                      <View style={styles.optionsRow}>
                        <TouchableOpacity
                          style={styles.rememberMeRow}
                          onPress={() => setRememberMe(!rememberMe)}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: rememberMe }}
                          accessibilityLabel="Remember my username"
                        >
                          <View
                            style={[
                              styles.checkbox,
                              rememberMe && styles.checkboxChecked,
                            ]}
                          >
                            {rememberMe && (
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="#FFF"
                              />
                            )}
                          </View>
                          <Text style={styles.rememberMeText}>Remember me</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleForgotPassword}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.forgotPasswordText}>
                            Forgot Password?
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <PremiumButton
                        title={loading ? "Signing in..." : "Sign In"}
                        onPress={handleLogin}
                        disabled={loading || !username || !password}
                        loading={loading}
                        variant="primary"
                        size="large"
                        icon="log-in-outline"
                        fullWidth
                      />
                    </Animated.View>
                  )}

                  {/* Mode Switch Button */}
                  <TouchableOpacity
                    style={styles.modeSwitchButton}
                    onPress={switchLoginMode}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        loginMode === "pin" ? "key-outline" : "keypad-outline"
                      }
                      size={16}
                      color={modernColors.primary[400]}
                    />
                    <Text style={styles.modeSwitchText}>
                      {loginMode === "pin"
                        ? "Use Username & Password"
                        : "Use PIN Instead"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.securityNotice}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={14}
                      color={modernColors.text.tertiary}
                    />
                    <Text style={styles.securityText}>
                      Secured with 256-bit encryption
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              entering={FadeInUp.delay(600).springify()}
              style={styles.footer}
            >
              <Text style={styles.versionText}>Version {APP_VERSION}</Text>
              <View style={styles.footerDivider} />
              <Text style={styles.copyrightText}>© 2025 Stock Verify</Text>
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
    backgroundColor: modernColors.background.default,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircle1: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: modernColors.primary[600],
    opacity: 0.12,
    transform: [{ scale: 1.3 }],
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -80,
    right: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: modernColors.accent[600],
    opacity: 0.1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT - 60,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.xl,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: modernSpacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.35)",
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    zIndex: -1,
  },
  title: {
    ...modernTypography.h1,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
  },
  formContainerWrapper: {
    width: "100%",
  },
  glassCard: {
    width: "100%",
  },
  form: {
    width: "100%",
  },
  formHeader: {
    marginBottom: modernSpacing.lg,
  },
  formTitle: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  formSubtitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  inputSection: {
    marginBottom: modernSpacing.lg,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: modernColors.border.medium,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.sm,
  },
  checkboxChecked: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[400],
  },
  rememberMeText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontWeight: "500",
  },
  forgotPasswordText: {
    ...modernTypography.body.small,
    color: modernColors.primary[400],
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: modernSpacing.lg,
    gap: modernSpacing.xs,
  },
  securityText: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
  // PIN Keypad Styles
  pinContainer: {
    alignItems: "center",
    paddingVertical: modernSpacing.md,
  },
  pinIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.xl,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: modernColors.border.medium,
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[400],
  },
  keypadContainer: {
    gap: modernSpacing.md,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: modernSpacing.md,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  keypadButtonEmpty: {
    width: 72,
    height: 72,
  },
  keypadText: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  loadingText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.lg,
    textAlign: "center",
  },
  modeSwitchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: modernSpacing.xs,
    marginTop: modernSpacing.lg,
    paddingVertical: modernSpacing.sm,
  },
  modeSwitchText: {
    ...modernTypography.body.small,
    color: modernColors.primary[400],
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: modernSpacing.xl,
    gap: modernSpacing.md,
  },
  versionText: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: modernColors.border.light,
  },
  copyrightText: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
});
