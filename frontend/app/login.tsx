import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, SafeAreaView, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeInDown,
  FadeInUp,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuthStore } from "../src/store/authStore";
import EnhancedTextInput from "../src/components/forms/EnhancedTextInput";
import EnhancedButton from "../src/components/forms/EnhancedButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const APP_VERSION = "2.1.0";

const STORAGE_KEYS = {
  REMEMBERED_USERNAME: "remembered_username_v1",
  REMEMBER_ME_ENABLED: "remember_me_enabled_v1",
};

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password handler
  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Password",
      "Please contact your administrator to reset your password.",
      [{ text: "OK", style: "default" }]
    );
  };

  // Animation values
  const logoScale = useSharedValue(0.8);
  const logoRotate = useSharedValue(0);

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
    logoScale.value = withSpring(1, { damping: 10 });
    logoRotate.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2000 }),
        withTiming(5, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
      true,
    );
  }, [logoScale, logoRotate]);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
    };
  });

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      // Save or clear remembered username
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBERED_USERNAME, username);
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, "true");
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, "false");
      }

      const success = await login(username, password);
      if (!success) {
        Alert.alert("Login Failed", "Invalid username or password");
      }
      // Router will auto-redirect based on user role in _layout
    } catch {
      Alert.alert("Login Failed", "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#334155"]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

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
                <Ionicons name="cube" size={56} color="#60A5FA" />
                <View style={styles.iconGlow} />
              </View>
              <Text style={styles.title}>Stock Verify</Text>
              <Text style={styles.subtitle}>Inventory Management System</Text>
            </Animated.View>

            {/* Login Form Card */}
            <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.formContainer}>
              <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
                <View style={styles.form}>
                  {/* Form Header */}
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>Welcome Back</Text>
                    <Text style={styles.formSubtitle}>Sign in to your account</Text>
                  </View>

                  {/* Input Fields */}
                  <View style={styles.inputSection}>
                    <EnhancedTextInput
                      label="Username"
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter your username"
                      autoCapitalize="none"
                      leftIcon="person-outline"
                      editable={!loading}
                      containerStyle={styles.input}
                      autoComplete="username"
                    />

                    <EnhancedTextInput
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      secureTextEntry
                      leftIcon="lock-closed-outline"
                      editable={!loading}
                      onSubmitEditing={handleLogin}
                      containerStyle={styles.input}
                      autoComplete="password"
                    />
                  </View>

                  {/* Options Row - Remember Me & Forgot Password */}
                  <View style={styles.optionsRow}>
                    <TouchableOpacity
                      style={styles.rememberMeRow}
                      onPress={() => setRememberMe(!rememberMe)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: rememberMe }}
                      accessibilityLabel="Remember my username"
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe && <Ionicons name="checkmark" size={12} color="#FFF" />}
                      </View>
                      <Text style={styles.rememberMeText}>Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Login Button */}
                  <EnhancedButton
                    title={loading ? "Signing in..." : "Sign In"}
                    onPress={handleLogin}
                    disabled={loading || !username || !password}
                    loading={loading}
                    style={styles.loginButton}
                    textStyle={styles.loginButtonText}
                    icon="log-in-outline"
                  />

                  {/* Security Notice */}
                  <View style={styles.securityNotice}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
                    <Text style={styles.securityText}>Secured with 256-bit encryption</Text>
                  </View>
                </View>
              </BlurView>
            </Animated.View>

            {/* Footer - Version Info */}
            <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.footer}>
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
    backgroundColor: "#0F172A",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT - 100,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.25)",
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    zIndex: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  formContainer: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  blurContainer: {
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  form: {
    width: "100%",
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
  },
  inputSection: {
    gap: 16,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  rememberMeText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  forgotPasswordText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#3B82F6",
    height: 52,
    borderRadius: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  securityNotice: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  securityText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    gap: 12,
  },
  versionText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
  footerDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
  },
  copyrightText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
});
