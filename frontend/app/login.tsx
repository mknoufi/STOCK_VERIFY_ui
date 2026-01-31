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
  ScrollView,
  useWindowDimensions,
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
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuthStore } from "../src/store/authStore";
import { useThemeContext } from "../src/theme/ThemeContext";
import { GlassCard } from "../src/components/ui";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from "../src/styles/modernDesignSystem";
import { SafeAreaView } from "react-native-safe-area-context";
import { PremiumInput } from "../src/components/premium/PremiumInput";
import { PremiumButton } from "../src/components/premium/PremiumButton";

const APP_VERSION = "2.5.0";
const PIN_LENGTH = 4;

// Responsive sizing helpers
const getResponsiveSizes = (width: number, _height: number) => {
  const isSmallPhone = width < 375;
  const isTablet = width >= 768;
  const scale = isSmallPhone ? 0.85 : isTablet ? 1.15 : 1;

  return {
    iconSize: Math.round(56 * scale),
    iconContainerSize: Math.round(96 * scale),
    keypadButtonSize: Math.round(isSmallPhone ? 60 : isTablet ? 80 : 72),
    keypadGap: Math.round(isSmallPhone ? 10 : isTablet ? 20 : 14),
    pinDotSize: Math.round(isSmallPhone ? 14 : isTablet ? 20 : 16),
    maxContentWidth: isTablet ? 480 : 420,
    horizontalPadding: isSmallPhone ? 20 : isTablet ? 40 : 24,
    titleSize: Math.round(34 * scale),
    subtitleSize: Math.round(16 * scale),
  };
};

type LoginMode = "pin" | "credentials";

const STORAGE_KEYS = {
  REMEMBERED_USERNAME: "remembered_username_v1",
  REMEMBER_ME_ENABLED: "remember_me_enabled_v1",
  PREFERRED_LOGIN_MODE: "preferred_login_mode_v1",
};

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const responsive = getResponsiveSizes(width, height);
  const { 
    login, 
    loginWithPin, 
    loginWithBiometrics, 
    isBiometricEnabled, 
    isBiometricSupported, 
    enableBiometrics 
  } = useAuthStore();
  const { theme } = useThemeContext();

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
  }, [cardTranslateY, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else {
        // Successful login
        if (isBiometricSupported && !isBiometricEnabled) {
          Alert.alert(
            "Enable Biometrics",
            "Would you like to enable FaceID/TouchID for faster login next time?",
            [
              {
                text: "No Thanks",
                style: "cancel",
              },
              {
                text: "Enable",
                onPress: async () => {
                   await enableBiometrics(pinValue);
                   Alert.alert("Success", "Biometrics enabled!");
                },
              },
            ]
          );
        }
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

  const handleBiometricLogin = async () => {
      const result = await loginWithBiometrics();
      if (!result.success) {
          Alert.alert("Authentication Failed", result.message);
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

  // Toggle functions for UI (used in credentials mode JSX below)
  const _toggleRememberMe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRememberMe(!rememberMe);
  };

  const _toggleShowPassword = () => {
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
        colors={["#020617", "#0F172A"]}
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
          contentContainerStyle={[styles.scrollContent, { minHeight: height - 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentContainer, {
            maxWidth: responsive.maxContentWidth,
            paddingHorizontal: responsive.horizontalPadding
          }]}>
            {/* Logo & Brand Section */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[styles.header, logoStyle]}
            >
              <View style={[styles.iconContainer, {
                width: responsive.iconContainerSize,
                height: responsive.iconContainerSize,
                borderRadius: responsive.iconContainerSize * 0.29,
              }]}>
                <Ionicons
                  name="cube"
                  size={responsive.iconSize}
                  color={theme.colors.accent}
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
                        accessible={true}
                        accessibilityLabel={`PIN entry: ${pin.length} of ${PIN_LENGTH} digits filled`}
                        accessibilityLiveRegion="polite"
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <View
                            key={index}
                            style={[
                              styles.pinDot,
                              { width: responsive.pinDotSize, height: responsive.pinDotSize, borderRadius: responsive.pinDotSize / 2 },
                              pin.length > index && styles.pinDotFilled,
                            ]}
                          />
                        ))}
                      </Animated.View>

                      {/* PIN Keypad */}
                      <View style={[styles.keypadContainer, { gap: responsive.keypadGap }]}>
                        {/* Row 1: 1, 2, 3 */}
                        <View style={[styles.keypadRow, { gap: responsive.keypadGap }]}>
                          {[1, 2, 3].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[styles.keypadButton, {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                              }]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`Number ${digit}`}
                            >
                              <Text style={styles.keypadText}>{digit}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 2: 4, 5, 6 */}
                        <View style={[styles.keypadRow, { gap: responsive.keypadGap }]}>
                          {[4, 5, 6].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[styles.keypadButton, {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                              }]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`Number ${digit}`}
                            >
                              <Text style={styles.keypadText}>{String(digit)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 3: 7, 8, 9 */}
                        <View style={[styles.keypadRow, { gap: responsive.keypadGap }]}>
                          {[7, 8, 9].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[styles.keypadButton, {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                              }]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`Number ${digit}`}
                            >
                              <Text style={styles.keypadText}>{String(digit)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 4: Biometric, 0, Backspace */}
                        <View style={[styles.keypadRow, { gap: responsive.keypadGap }]}>
                          {isBiometricEnabled ? (
                            <TouchableOpacity
                              style={[styles.keypadButton, {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                                backgroundColor: 'rgba(255,255,255,0.1)', // Subtle background
                              }]}
                              onPress={handleBiometricLogin}
                              disabled={loading}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel="Log in with Biometrics"
                            >
                              <Ionicons
                                name={Platform.OS === 'ios' ? "scan-outline" : "finger-print-outline"}
                                size={Math.round(responsive.keypadButtonSize * 0.45)}
                                color={modernColors.text.primary}
                              />
                            </TouchableOpacity>
                          ) : (
                             <View style={{ width: responsive.keypadButtonSize, height: responsive.keypadButtonSize }} />
                          )}
                          <TouchableOpacity
                            style={[styles.keypadButton, {
                              width: responsive.keypadButtonSize,
                              height: responsive.keypadButtonSize,
                              borderRadius: responsive.keypadButtonSize / 2,
                            }]}
                            onPress={() => handlePinDigit(String(0))}
                            disabled={loading}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Number 0"
                          >
                            <Text style={styles.keypadText}>{String(0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.keypadButton, {
                              width: responsive.keypadButtonSize,
                              height: responsive.keypadButtonSize,
                              borderRadius: responsive.keypadButtonSize / 2,
                            }]}
                            onPress={handlePinBackspace}
                            disabled={loading || pin.length === 0}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Delete last digit"
                            accessibilityHint="Double tap to delete the last entered digit"
                          >
                            <Ionicons
                              name="backspace-outline"
                              size={Math.round(responsive.keypadButtonSize * 0.33)}
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
                          accessibilityRole="button"
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
                    accessibilityRole="button"
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
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.xl,
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
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.sm,
  },
  checkboxChecked: {
    backgroundColor: "#0EA5E9",
    borderColor: "#38BDF8",
  },
  rememberMeText: {
    ...modernTypography.body.small,
    color: "#94A3B8",
    fontWeight: "500",
  },
  forgotPasswordText: {
    ...modernTypography.body.small,
    color: "#0EA5E9",
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
    color: "#64748B",
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
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: "#0EA5E9",
    borderColor: "#38BDF8",
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
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  keypadButtonEmpty: {
    width: 72,
    height: 72,
  },
  keypadText: {
    ...modernTypography.h2,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  loadingText: {
    ...modernTypography.body.small,
    color: "#94A3B8",
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
    color: "#0EA5E9",
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
    color: "#64748B",
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  copyrightText: {
    ...modernTypography.label.small,
    color: "#64748B",
  },
});
