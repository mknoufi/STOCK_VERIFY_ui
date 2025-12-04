import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import EnhancedTextInput from "../src/components/forms/EnhancedTextInput";
import EnhancedButton from "../src/components/forms/EnhancedButton";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      Alert.alert("Login Failed", "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.gradient}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Ionicons name="cube-outline" size={64} color="#3B82F6" />
          <Text style={styles.title}>Stock Verify</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <EnhancedTextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            leftIcon="person-outline"
            editable={!loading}
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
          />

          <EnhancedButton
            title={loading ? "Signing in..." : "Sign In"}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={styles.loginButton}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
  },
  form: {
    gap: 16,
  },
  loginButton: {
    marginTop: 8,
  },
});
