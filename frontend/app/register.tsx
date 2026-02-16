import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "@/services/asyncStorageService";
import { useAuthStore } from "@/store/authStore";
import { registerUser } from "@/services/api/api";
import { AppLogo } from "@/components/AppLogo";
import { ScreenContainer, GlassCard } from "@/components/ui";
import { PremiumInput } from "@/components/premium/PremiumInput";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { useThemeContext } from "@/theme/ThemeContext";

export default function Register() {
  const [formData, setFormData] = React.useState({
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    employee_id: "",
    phone: "",
  });
  const [loading, setLoading] = React.useState(false);

  const { theme } = useThemeContext();

  const router = useRouter();

  const handleRegister = async () => {
    // Validation
    if (!formData.username || !formData.password || !formData.full_name) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await registerUser({
        username: formData.username.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        employee_id: formData.employee_id.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      // Save user data (the registration response should include user info)
      if (response.user) {
        await storage.set("user", JSON.stringify(response.user));

        // Update auth store using setUser method
        useAuthStore.getState().setUser(response.user);
      }

      // Navigate based on role
      if (response.user?.role === "staff") {
        router.replace("/staff/home");
      } else {
        router.replace("/supervisor/dashboard");
      }
    } catch (error: any) {
      let errorMessage = "Unable to register. Please try again.";

      // Use structured error message if available
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object" && errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === "object" && errorData.detail) {
          if (
            typeof errorData.detail === "object" &&
            errorData.detail.message
          ) {
            errorMessage = errorData.detail.message;
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          }
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Provide helpful context
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("Username")
      ) {
        errorMessage =
          "Username already exists. Please choose a different username.";
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNABORTED")
      ) {
        errorMessage =
          "Connection timeout. Please check your connection and try again.";
      } else if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("Cannot connect")
      ) {
        errorMessage =
          "Cannot connect to server. Please check if the backend server is running.";
      }

      // Add fix button based on error type
      let fixButton: { text: string; onPress: () => void } | undefined;

      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("Username")
      ) {
        fixButton = {
          text: "Choose Different Username",
          onPress: () => {
            setFormData({ ...formData, username: "" });
            // Focus will be handled by component state
          },
        };
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNABORTED")
      ) {
        fixButton = {
          text: "Retry Registration",
          onPress: () => {
            setTimeout(() => handleRegister(), 500);
          },
        };
      } else if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("Cannot connect")
      ) {
        fixButton = {
          text: "Check Connection & Retry",
          onPress: () => {
            setTimeout(() => handleRegister(), 1000);
          },
        };
      } else if (
        errorMessage.includes("validation") ||
        errorMessage.includes("required")
      ) {
        fixButton = {
          text: "Fix Form",
          onPress: () => {
            // Scroll to top or highlight required fields
            // Form validation will handle highlighting
          },
        };
      }

      Alert.alert(
        "Registration Failed",
        errorMessage,
        fixButton
          ? [{ text: "Cancel", style: "cancel" }, fixButton]
          : [{ text: "OK" }],
      );
      __DEV__ && console.error("Registration error details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer
      backgroundType="aurora"
      auroraVariant="primary"
      auroraIntensity="high"
      withParticles
      header={{
        title: "Create Account",
        showBackButton: true,
        showLogoutButton: false,
      }}
      contentMode="keyboard-scroll"
    >
      <View
        style={[
          styles.content,
          Platform.OS === "web" && {
            maxWidth: 520,
            width: "100%",
            alignSelf: "center",
          },
        ]}
      >
        <View style={styles.header}>
          <AppLogo size="medium" showText variant="default" />
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Join the Stock Verification Team
          </Text>
        </View>

        <GlassCard variant="strong" elevation="lg" style={styles.card}>
          <PremiumInput
            label="Username"
            required
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Enter username"
            autoCapitalize="none"
            leftIcon="person-outline"
          />

          <PremiumInput
            label="Full Name"
            required
            value={formData.full_name}
            onChangeText={(text) => setFormData({ ...formData, full_name: text })}
            placeholder="Enter your full name"
            autoCapitalize="words"
            leftIcon="person"
          />

          <PremiumInput
            label="Employee ID"
            value={formData.employee_id}
            onChangeText={(text) =>
              setFormData({ ...formData, employee_id: text })
            }
            placeholder="Enter employee ID (optional)"
            autoCapitalize="none"
            leftIcon="card-outline"
          />

          <PremiumInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number (optional)"
            autoCapitalize="none"
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />

          <PremiumInput
            label="Password"
            required
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="Enter password (min 6 characters)"
            autoCapitalize="none"
            secureTextEntry
            leftIcon="lock-closed-outline"
          />

          <PremiumInput
            label="Confirm Password"
            required
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            placeholder="Re-enter password"
            autoCapitalize="none"
            secureTextEntry
            leftIcon="lock-closed-outline"
          />

          <PremiumButton
            title={loading ? "Creating Account..." : "Create Account"}
            onPress={handleRegister}
            loading={loading}
            fullWidth
            icon="person-add-outline"
          />

          <View style={styles.loginLink}>
            <Text style={[styles.loginLinkText, { color: theme.colors.textSecondary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={[styles.loginLinkButton, { color: theme.colors.accent }]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: Platform.OS === "web" ? 32 : 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    marginTop: 8,
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLinkButton: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
