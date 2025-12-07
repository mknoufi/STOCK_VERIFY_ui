import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../src/store/authStore";
import { PremiumInput } from "../src/components/premium/PremiumInput";
import { PremiumButton } from "../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
} from "../src/styles/modernDesignSystem";

const { width, height } = Dimensions.get("window");

// Animated floating shapes for background
const FloatingShape: React.FC<{
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
}> = ({ delay, size, startX, startY, color }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -30,
              duration: 3000 + delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 15,
              duration: 3000 + delay,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: 3000 + delay,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 3000 + delay,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    setTimeout(animate, delay);
  }, [delay, translateY, translateX, opacity]);

  return (
    <Animated.View
      style={[
        styles.floatingShape,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
};

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale, logoRotate]);

  const handleLogin = async () => {
    if (!username || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await login(username, password);
      if (!success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login Failed", "Invalid username or password");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Background */}
      <LinearGradient
        colors={[
          modernColors.background.default,
          modernColors.primary[900],
          modernColors.background.default,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Background Shapes */}
      <View style={styles.shapesContainer}>
        <FloatingShape delay={0} size={120} startX={width * 0.1} startY={height * 0.15} color={modernColors.primary[500]} />
        <FloatingShape delay={500} size={80} startX={width * 0.7} startY={height * 0.1} color={modernColors.secondary[500]} />
        <FloatingShape delay={1000} size={60} startX={width * 0.8} startY={height * 0.6} color={modernColors.accent[500]} />
        <FloatingShape delay={1500} size={100} startX={width * 0.05} startY={height * 0.7} color={modernColors.primary[400]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: logoScale }, { rotate: logoSpin }],
                },
              ]}
            >
              <LinearGradient
                colors={[modernColors.primary[400], modernColors.primary[600]]}
                style={styles.iconGradient}
              >
                <Ionicons
                  name="cube"
                  size={48}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </Animated.View>

            <Text style={styles.title}>Stock Verify</Text>
            <Text style={styles.subtitle}>Inventory Management Made Simple</Text>
          </Animated.View>

          {/* Animated Form */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.formCard}>
              <PremiumInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
                icon="person-outline"
                editable={!loading}
              />

              <PremiumInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                icon="lock-closed-outline"
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                editable={!loading}
                onSubmitEditing={handleLogin}
              />

              <PremiumButton
                title={loading ? "Signing in..." : "Sign In"}
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                style={styles.loginButton}
                size="large"
                icon="log-in-outline"
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>
              Secure login with enterprise-grade encryption
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  shapesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  floatingShape: {
    position: "absolute",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: modernSpacing.screenPadding,
    minHeight: height,
  },
  header: {
    alignItems: "center",
    marginBottom: modernSpacing["2xl"],
  },
  iconContainer: {
    marginBottom: modernSpacing.lg,
    borderRadius: 32,
    overflow: "hidden",
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...modernTypography.display.small,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
    textAlign: "center",
  },
  form: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  formCard: {
    backgroundColor: modernColors.background.glass,
    borderRadius: 24,
    padding: modernSpacing.lg,
    gap: modernSpacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  loginButton: {
    marginTop: modernSpacing.sm,
  },
  footer: {
    marginTop: modernSpacing["2xl"],
    alignItems: "center",
  },
  footerText: {
    ...modernTypography.label.medium,
    color: modernColors.text.tertiary,
    textAlign: "center",
  },
});

