import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  const router = useRouter();
  const { user, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    // Ensure auth state is loaded
    (async () => {
      try {
        await loadStoredAuth();
      } catch {
        // ignore; user can login manually
      }

      // Small delay to avoid redirect loops
      setTimeout(
        () => {
          if (!user) {
            router.replace("/welcome");
            return;
          }
          if (Platform.OS === "web" && (user.role === "supervisor" || user.role === "admin")) {
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

  return (
    <LinearGradient colors={["#0F172A", "#1E293B", "#334155"]} style={styles.container}>
      <StatusBar style="light" />
      <ActivityIndicator color="#3B82F6" size="large" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
