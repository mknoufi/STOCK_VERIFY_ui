/**
 * Login Screen - Aurora Design v2.0 with Unified Theme Tokens
 *
 * Features:
 * - Aurora gradient animated background
 * - Glassmorphism login card
 * - PIN keypad (primary for staff)
 * - Username/password (secondary for admin/supervisor)
 * - Remember me functionality
 * - Smooth animations
 * - Uses unified theme tokens from @/theme/unified
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { GlassCard } from "../src/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { PremiumInput } from "../src/components/premium/PremiumInput";
import { PremiumButton } from "../src/components/premium/PremiumButton";
import { useThemeContext } from "../src/context/ThemeContext";
// Unified theme tokens - primary source of truth
import {
  colors,
  semanticColors,
  spacing,
  textStyles,
  radius,
  gradients,
} from "../src/theme/unified";

const APP_VERSION = "2.5.0";
const PIN_LENGTH = 4;

// Static styles - moved outside component to prevent recreation on every render
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.background.default,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: `${colors.primary[500]}59`, // 35% opacity
    backgroundColor: `${colors.primary[500]}26`, // 15% opacity
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    backgroundColor: `${colors.primary[500]}14`, // 8% opacity
    zIndex: -1,
  },
  title: {
    ...textStyles.h1,
    color: colors.white, // White for contrast on gradient
    marginBottom: spacing.xs,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...textStyles.body1,
    color: 'rgba(255, 255, 255, 0.85)', // Light text for contrast
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
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...textStyles.h2,
    color: colors.white, // White for contrast inside glass card
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...textStyles.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  passwordInput: {
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[400],
  },
  rememberMeText: {
    ...textStyles.body2,
    color: semanticColors.text.tertiary,
    fontWeight: "500",
  },
  forgotPasswordText: {
    ...textStyles.body2,
    color: colors.primary[500],
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  securityText: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
  },
  // PIN Keypad Styles
  pinContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  pinIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pinDot: {
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)", // More visible
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  keypadContainer: {
    gap: spacing.md,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  keypadButton: {
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glass effect
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  keypadText: {
    ...textStyles.h2,
    color: colors.white, // White text on glass buttons
    fontWeight: "600",
  },
  loadingText: {
    ...textStyles.body2,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.lg,
    textAlign: "center",
  },
  modeSwitchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modeSwitchText: {
    ...textStyles.body2,
    color: colors.primary[500],
    fontWeight: "500",
  },
  // Form error display
  errorContainer: {
    backgroundColor: `${colors.error[500]}20`,
    borderWidth: 1,
    borderColor: colors.error[500],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...textStyles.body2,
    color: colors.error[400],
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  versionText: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: radius.xs,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  copyrightText: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
  },
  // Decorative circles - using unified colors
  decorativeCircle1: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: colors.primary[600],
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
    backgroundColor: colors.secondary[600],
    opacity: 0.1,
  },
});

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
  const { login, loginWithPin } = useAuthStore();
  // ThemeContext kept for future dark mode toggle - tokens used from unified
  useThemeContext();

  // Login mode state (PIN is primary/default)
  const [loginMode, setLoginMode] = useState<LoginMode>("pin");

  // PIN state
  const [pin, setPin] = useState("");

  // Credentials state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Validation state for visual feedback
  const [formErrors, setFormErrors] = useState<{
    username?: string;
    password?: string;
    general?: string;
  }>({});
  const [formTouched, setFormTouched] = useState<{
    username: boolean;
    password: boolean;
  }>({ username: false, password: false });

  // Refs for stable handlers
  const formTouchedRef = useRef(formTouched);
  const usernameRef = useRef(username);
  const passwordRef = useRef(password);

  useEffect(() => {
    formTouchedRef.current = formTouched;
    usernameRef.current = username;
    passwordRef.current = password;
  }, [formTouched, username, password]);

  // Animation values
  const logoScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(50);
  const pinShake = useSharedValue(0);

  // Memoized animations to prevent re-renders
  const fadeIn = useMemo(() => FadeIn.duration(200), []);
  const fadeOut = useMemo(() => FadeOut.duration(200), []);
  const fadeInDown = useMemo(() => FadeInDown.delay(200).springify(), []);
  const fadeInUpForm = useMemo(() => FadeInUp.delay(400).springify(), []);
  const fadeInUpFooter = useMemo(() => FadeInUp.delay(600).springify(), []);

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

  // Handle PIN login
  const handlePinLogin = useCallback(async (pinValue: string) => {
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
  }, [loginWithPin, triggerShake]);

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
    [pin, loading, handlePinLogin],
  );

  // Handle PIN backspace
  const handlePinBackspace = useCallback(() => {
    if (loading || pin.length === 0) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setPin(pin.slice(0, -1));
  }, [pin, loading]);

  // Switch login mode
  const switchLoginMode = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoginMode(loginMode === "pin" ? "credentials" : "pin");
    setPin("");
    // Clear form errors when switching modes
    setFormErrors({});
    setFormTouched({ username: false, password: false });
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

  // Validate form fields
  const validateForm = useCallback(() => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [username, password]);

  // Handle field blur for validation
  const handleFieldBlur = useCallback((field: "username" | "password") => {
    setFormTouched(prev => ({ ...prev, [field]: true }));

    // Validate specific field using refs
    if (field === "username") {
      const currentUsername = usernameRef.current;
      if (!currentUsername.trim()) {
        setFormErrors(prev => ({ ...prev, username: "Username is required" }));
      } else if (currentUsername.length < 3) {
        setFormErrors(prev => ({
          ...prev,
          username: "Username must be at least 3 characters"
        }));
      } else {
        setFormErrors(prev => ({ ...prev, username: undefined }));
      }
    }

    if (field === "password") {
      const currentPassword = passwordRef.current;
      if (!currentPassword) {
        setFormErrors(prev => ({ ...prev, password: "Password is required" }));
      } else if (currentPassword.length < 4) {
        setFormErrors(prev => ({
          ...prev,
          password: "Password must be at least 4 characters"
        }));
      } else {
        setFormErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  }, []);

  // Stable handlers for input changes
  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    if (formTouchedRef.current.username && !text.trim()) {
      setFormErrors(prev => ({
        ...prev,
        username: "Username is required"
      }));
    } else {
      setFormErrors(prev => ({
        ...prev,
        username: undefined
      }));
    }
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    if (formTouchedRef.current.password && !text) {
      setFormErrors(prev => ({
        ...prev,
        password: "Password is required"
      }));
    } else {
      setFormErrors(prev => ({
        ...prev,
        password: undefined
      }));
    }
  }, []);

  const handleLogin = async () => {
    // Mark all fields as touched
    setFormTouched({ username: true, password: true });

    // Validate form
    if (!validateForm()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setLoading(true);
    setFormErrors({});

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
        setFormErrors({
          general: result.message || "Invalid username or password"
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {
      setFormErrors({ general: "An unexpected error occurred" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        // Use unified gradients or fall back to primary colors
        colors={gradients.aurora || [semanticColors.background.primary, colors.primary[900]]}
        style={StyleSheet.absoluteFillObject}
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
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height - 60 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.contentContainer,
              {
                maxWidth: responsive.maxContentWidth,
                paddingHorizontal: responsive.horizontalPadding,
              },
            ]}
          >
            {/* Logo & Brand Section */}
            <Animated.View
              entering={fadeInDown}
              style={[styles.header, logoStyle]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    width: responsive.iconContainerSize,
                    height: responsive.iconContainerSize,
                    borderRadius: responsive.iconContainerSize * 0.29,
                  },
                ]}
              >
                <Ionicons
                  name="cube"
                  size={responsive.iconSize}
                  color={colors.primary[500]}
                />
                <View style={[styles.iconGlow, { width: responsive.iconContainerSize * 1.25, height: responsive.iconContainerSize * 1.25, borderRadius: responsive.iconContainerSize * 0.375 }]} />
              </View>
              <Text style={styles.title}>Stock Verify</Text>
              <Text style={styles.subtitle}>Inventory Management System</Text>
            </Animated.View>

            {/* Login Form Card */}
            <Animated.View
              entering={fadeInUpForm}
              style={styles.formContainerWrapper}
            >
              <GlassCard
                variant="strong"
                intensity={40}
                borderRadius={radius.xl}
                padding={spacing.xl}
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
                      key="pin-mode"
                      entering={fadeIn}
                      exiting={fadeOut}
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
                              {
                                width: responsive.pinDotSize,
                                height: responsive.pinDotSize,
                                borderRadius: responsive.pinDotSize / 2,
                              },
                              pin.length > index && styles.pinDotFilled,
                            ]}
                          />
                        ))}
                      </Animated.View>

                      {/* PIN Keypad */}
                      <View
                        style={[
                          styles.keypadContainer,
                          { gap: responsive.keypadGap },
                        ]}
                      >
                        {/* Row 1: 1, 2, 3 */}
                        <View
                          style={[
                            styles.keypadRow,
                            { gap: responsive.keypadGap },
                          ]}
                        >
                          {[1, 2, 3].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[
                                styles.keypadButton,
                                {
                                  width: responsive.keypadButtonSize,
                                  height: responsive.keypadButtonSize,
                                  borderRadius: responsive.keypadButtonSize / 2,
                                },
                              ]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>{digit}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 2: 4, 5, 6 */}
                        <View
                          style={[
                            styles.keypadRow,
                            { gap: responsive.keypadGap },
                          ]}
                        >
                          {[4, 5, 6].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[
                                styles.keypadButton,
                                {
                                  width: responsive.keypadButtonSize,
                                  height: responsive.keypadButtonSize,
                                  borderRadius: responsive.keypadButtonSize / 2,
                                },
                              ]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>
                                {String(digit)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 3: 7, 8, 9 */}
                        <View
                          style={[
                            styles.keypadRow,
                            { gap: responsive.keypadGap },
                          ]}
                        >
                          {[7, 8, 9].map((digit) => (
                            <TouchableOpacity
                              key={digit}
                              style={[
                                styles.keypadButton,
                                {
                                  width: responsive.keypadButtonSize,
                                  height: responsive.keypadButtonSize,
                                  borderRadius: responsive.keypadButtonSize / 2,
                                },
                              ]}
                              onPress={() => handlePinDigit(String(digit))}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.keypadText}>
                                {String(digit)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Row 4: Empty, 0, Backspace */}
                        <View
                          style={[
                            styles.keypadRow,
                            { gap: responsive.keypadGap },
                          ]}
                        >
                          <View
                            style={{
                              width: responsive.keypadButtonSize,
                              height: responsive.keypadButtonSize,
                            }}
                          />
                          <TouchableOpacity
                            style={[
                              styles.keypadButton,
                              {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                              },
                            ]}
                            onPress={() => handlePinDigit(String(0))}
                            disabled={loading}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.keypadText}>{String(0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.keypadButton,
                              {
                                width: responsive.keypadButtonSize,
                                height: responsive.keypadButtonSize,
                                borderRadius: responsive.keypadButtonSize / 2,
                              },
                            ]}
                            onPress={handlePinBackspace}
                            disabled={loading || pin.length === 0}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="backspace-outline"
                              size={Math.round(
                                responsive.keypadButtonSize * 0.33,
                              )}
                              color={
                                pin.length === 0
                                  ? semanticColors.text.tertiary
                                  : semanticColors.text.primary
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
                      key="credentials-mode"
                      entering={fadeIn}
                      exiting={fadeOut}
                    >
                      {/* General error message */}
                      {formErrors.general && (
                        <Animated.View
                          entering={fadeIn}
                          style={styles.errorContainer}
                        >
                          <Text style={styles.errorText}>
                            {formErrors.general}
                          </Text>
                        </Animated.View>
                      )}

                      <View style={styles.inputSection}>
                        <PremiumInput
                          key="username-input"
                          label="Username"
                          value={username}
                          onChangeText={handleUsernameChange}
                          onBlur={() => handleFieldBlur("username")}
                          placeholder="Enter your username"
                          autoCapitalize="none"
                          leftIcon="person-outline"
                          editable={!loading}
                          error={formTouched.username ? formErrors.username : undefined}
                        />

                        <PremiumInput
                          key="password-input"
                          label="Password"
                          value={password}
                          onChangeText={handlePasswordChange}
                          onBlur={() => handleFieldBlur("password")}
                          placeholder="Enter your password"
                          secureTextEntry
                          leftIcon="lock-closed-outline"
                          editable={!loading}
                          style={styles.passwordInput}
                          error={formTouched.password ? formErrors.password : undefined}
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
                      color={colors.primary[400]}
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
                      color={semanticColors.text.tertiary}
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
              entering={fadeInUpFooter}
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
