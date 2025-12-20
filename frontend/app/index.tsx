import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuthStore } from "../src/store/authStore";
import { AuroraBackground } from "../src/components/ui/AuroraBackground";
import { GlassCard } from "../src/components/ui/GlassCard";
import { modernTypography, modernColors, modernSpacing } from "../src/styles/modernDesignSystem";

export default function Index() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Auth redirection logic
    const checkAuth = async () => {
      // Small delay for animation/UX
      setTimeout(() => {
        if (!user) {
          router.replace("/welcome");
          return;
        }

        if (Platform.OS === "web") {
          // Web specific routing
          if (user.role === "supervisor" || user.role === "admin") {
            router.replace("/admin/metrics" as any);
          } else {
            router.replace("/staff/home" as any);
          }
        } else {
          // Mobile routing
          if (user.role === "supervisor" || user.role === "admin") {
            router.replace("/supervisor/dashboard" as any);
          } else {
            router.replace("/staff/home" as any);
          }
        }
      }, 1500); // 1.5s delay to show the beautiful splash
    };

    checkAuth();
  }, [user, router]);

  return (
    <AuroraBackground variant="primary" intensity="high" animated={true}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.contentContainer}
        >
          <GlassCard variant="strong" elevation="lg" style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.iconPlaceholder}>
                <Text style={styles.iconText}>SV</Text>
              </View>
              <Text style={styles.title}>Stock Verify</Text>
              <Text style={styles.subtitle}>Enterprise Audit System</Text>
            </View>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={modernColors.primary[400]} />
              <Text style={styles.loadingText}>Initializing Secure Environment...</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(600).duration(1000)}
          style={styles.versionText}
        >
          v2.0.0 • Aurora Engine
        </Animated.Text>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.xl,
  },
  contentContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: 'center',
  },
  card: {
    width: "100%",
    alignItems: "center",
    paddingVertical: modernSpacing["3xl"],
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: modernSpacing["2xl"],
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: modernColors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: modernSpacing.md,
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  iconText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  title: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    textAlign: "center",
    marginBottom: modernSpacing.xs,
  },
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: "center",
    gap: modernSpacing.md,
  },
  loadingText: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
  },
  versionText: {
    position: 'absolute',
    bottom: 50,
    ...modernTypography.label.small,
    color: "rgba(255,255,255,0.3)",
  }
});
