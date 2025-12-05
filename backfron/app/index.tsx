import React, { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { modernColors } from "../src/styles/modernDesignSystem";

export default function IndexScreen() {
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

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: modernColors.background.default,
      }}
    >
      <ActivityIndicator color={modernColors.primary[500]} size="large" />
    </View>
  );
}
