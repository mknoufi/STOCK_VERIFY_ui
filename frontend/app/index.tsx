import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuthStore } from "../src/store/authStore";
import { AuroraBackground } from "../src/components/ui/AuroraBackground";
import { GlassCard } from "../src/components/ui/GlassCard";
import { useThemeContext } from "../src/theme/ThemeContext";
import type { AppTheme } from "../src/theme/themes";
import { getRouteForRole, UserRole } from "../src/utils/roleNavigation";

export default function Index() {
  const router = useRouter();
  const { user, isLoading, isInitialized } = useAuthStore();
  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (isLoading || !isInitialized) return;

    // Explicitly navigate away from the splash once auth check finishes
    if (user) {
      const target = getRouteForRole(user.role as UserRole);
      router.replace(target as any);
    } else {
      router.replace("/welcome");
    }
  }, [isLoading, isInitialized, router, user]);

  return (
    <AuroraBackground variant="primary" intensity="high" animated>
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
              <ActivityIndicator size="large" color={theme.colors.accentLight} />
              <Text style={styles.loadingText}>Initializing Secure Environment...</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(600).duration(1000)}
          style={styles.versionText}
        >
          {"v2.0.0 • Aurora Engine"}
        </Animated.Text>
      </View>
    </AuroraBackground>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    contentContainer: {
      width: "100%",
      maxWidth: 400,
      alignItems: "center",
    },
    card: {
      width: "100%",
      alignItems: "center",
      paddingVertical: theme.spacing.xxl,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    iconPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: theme.colors.accent,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.md,
      shadowColor: theme.colors.accent,
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
      fontSize: 28,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.25,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: "400",
      color: theme.colors.textSecondary,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    loadingContainer: {
      alignItems: "center",
      gap: theme.spacing.md,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: "400",
      color: theme.colors.muted,
    },
    versionText: {
      position: "absolute",
      bottom: 50,
      fontSize: 12,
      fontWeight: "500",
      color: "rgba(255,255,255,0.3)",
    },
  });
