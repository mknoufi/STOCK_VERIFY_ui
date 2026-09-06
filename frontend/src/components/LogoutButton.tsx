import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "expo-router";

interface LogoutButtonProps {
  showText?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "icon" | "text" | "both";
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  showText = true,
  size = "medium",
  variant = "both",
}) => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      `${user?.full_name || "User"}, are you sure you want to logout?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const iconSize = size === "small" ? 20 : size === "large" ? 28 : 24;
  const fontSize = size === "small" ? 14 : size === "large" ? 18 : 16;

  return (
    <TouchableOpacity
      style={[styles.button, styles[`button${variant}`]]}
      onPress={handleLogout}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      disabled={isLoggingOut}
      accessibilityRole="button"
      accessibilityLabel="Logout"
      accessibilityHint="Logs you out of the application"
      accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
    >
      <View style={[styles.contentContainer, { opacity: isLoggingOut ? 0 : 1 }]}>
        {(variant === "icon" || variant === "both") && (
          <Ionicons name="log-out-outline" size={iconSize} color="#FF5252" />
        )}
        {(variant === "text" || variant === "both") && showText && (
          <Text style={[styles.buttonText, { fontSize }]}>Logout</Text>
        )}
      </View>
      {isLoggingOut && (
        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <ActivityIndicator style={styles.loader} size="small" color="#FF5252" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
  },
  buttonicon: {
    padding: 10,
    backgroundColor: "rgba(255, 82, 82, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.3)",
  },
  buttontext: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFEBEE",
  },
  buttonboth: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFEBEE",
    gap: 8,
  },
  buttonText: {
    color: "#FF5252",
    fontWeight: "600",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
