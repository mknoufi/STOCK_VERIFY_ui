import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { PremiumButton } from "../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
} from "../src/styles/modernDesignSystem";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="cube-outline"
            size={96}
            color={modernColors.primary[500]}
          />
        </View>
        <Text style={styles.title}>Stock Verify</Text>
        <Text style={styles.version}>v2.1</Text>
        <Text style={styles.subtitle}>Inventory Management System</Text>
        <Text style={styles.description}>
          Streamline your stock counting and verification process with real-time
          sync and offline support
        </Text>
      </View>

      <View style={styles.actions}>
        <PremiumButton
          title="Sign In"
          onPress={() => router.push("/login")}
          icon="log-in-outline"
          size="large"
          style={styles.primaryButton}
        />

        <PremiumButton
          title="Quick Start"
          onPress={() => router.push("/staff/home")}
          variant="secondary"
          icon="flash-outline"
          size="large"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: modernSpacing.screenPadding,
    justifyContent: "space-between",
    backgroundColor: modernColors.background.default,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: modernSpacing.md,
  },
  iconContainer: {
    marginBottom: modernSpacing.xl,
    padding: modernSpacing.xl,
    backgroundColor: modernColors.background.paper,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  title: {
    ...modernTypography.display.small,
    color: modernColors.text.primary,
    textAlign: "center",
  },
  version: {
    ...modernTypography.label.medium,
    color: modernColors.text.tertiary,
  },
  subtitle: {
    ...modernTypography.h5,
    color: modernColors.primary[400],
    textAlign: "center",
    marginTop: modernSpacing.sm,
  },
  description: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
    textAlign: "center",
    maxWidth: 320,
    marginTop: modernSpacing.md,
  },
  actions: {
    gap: modernSpacing.md,
    paddingBottom: modernSpacing.xl,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  primaryButton: {
    marginBottom: modernSpacing.xs,
  },
});
