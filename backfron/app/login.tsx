import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { PremiumInput } from "../src/components/premium/PremiumInput";
import { PremiumButton } from "../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
} from "../src/styles/modernDesignSystem";

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
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
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="cube-outline"
                size={64}
                color={modernColors.primary[500]}
              />
            </View>
            <Text style={styles.title}>Stock Verify</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: modernSpacing.screenPadding,
  },
  header: {
    alignItems: "center",
    marginBottom: modernSpacing.xl,
  },
  iconContainer: {
    marginBottom: modernSpacing.lg,
    padding: modernSpacing.lg,
    backgroundColor: modernColors.background.paper,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  title: {
    ...modernTypography.h1,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  subtitle: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
  },
  form: {
    gap: modernSpacing.md,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  loginButton: {
    marginTop: modernSpacing.sm,
  },
});
