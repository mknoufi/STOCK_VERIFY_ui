import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { StatusBar } from "expo-status-bar";

// Conditionally import LinearGradient - may not work on web
let LinearGradient: any;
try {
  LinearGradient = require("expo-linear-gradient").LinearGradient;
} catch {
  LinearGradient = null;
}

console.log("🌐 [WEB DEBUG] index.tsx loaded, Platform:", Platform.OS);

export default function Index() {
  console.log("🌐 [WEB DEBUG] Index component rendering...");
  const router = useRouter();
  const { user, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    // Ensure auth state is loaded
    // Ensure auth state check
    (async () => {
      // Small delay to avoid redirect loops
      setTimeout(
        () => {
          if (!user) {
            router.replace("/welcome");
            return;
          }
          if (
            Platform.OS === "web" &&
            (user.role === "supervisor" || user.role === "admin")
          ) {
            router.replace("/admin/metrics" as any);
          } else if (user.role === "supervisor" || user.role === "admin") {
            router.replace("/supervisor/dashboard" as any);
          } else {
            router.replace("/staff/home" as any);
          }
        },
        Platform.OS === "web" ? 200 : 100,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  // Use LinearGradient if available, fallback to View for web
  const Container = LinearGradient || View;
  const containerProps = LinearGradient
    ? { colors: ["#0F172A", "#1E293B", "#334155"], style: styles.container }
    : { style: [styles.container, { backgroundColor: "#0F172A" }] };

  return (
    <Container {...containerProps}>
      <StatusBar style="light" />
      <ActivityIndicator color="#3B82F6" size="large" />
      {Platform.OS === "web" && (
        <Text style={{ color: "white", marginTop: 20 }}>
          Loading... (Web Debug)
        </Text>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
