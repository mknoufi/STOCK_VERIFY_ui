/**
 * StaffCrashScreen Component
 *
 * Fallback UI for ErrorBoundary in staff layouts.
 * Provides a recovery path when staff screens crash.
 * Optimized for scan-first workflow recovery.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "../../theme/auroraTheme";

interface StaffCrashScreenProps {
  error: Error;
  resetError: () => void;
}

export const StaffCrashScreen: React.FC<StaffCrashScreenProps> = ({
  error,
  resetError,
}) => {
  const router = useRouter();

  const handleGoToScan = () => {
    resetError();
    router.replace("/staff/scan");
  };

  const handleLogout = () => {
    resetError();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={auroraTheme.colors.status.error}
          />
        </View>

        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.subtitle}>
          The scanning interface encountered an error.
        </Text>

        <View style={styles.errorBox}>
          <Text style={styles.errorLabel}>Error Details:</Text>
          <Text style={styles.errorMessage}>
            {error.message || "An unexpected error occurred"}
          </Text>
        </View>

        {__DEV__ && error.stack && (
          <ScrollView style={styles.stackContainer}>
            <Text style={styles.stackTitle}>Stack Trace (Dev Only):</Text>
            <Text style={styles.stack}>{error.stack}</Text>
          </ScrollView>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={resetError}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoToScan}
          >
            <Ionicons
              name="scan-outline"
              size={20}
              color={auroraTheme.colors.primary[500]}
            />
            <Text style={styles.secondaryButtonText}>Back to Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={auroraTheme.colors.text.secondary}
            />
            <Text style={styles.outlineButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: auroraTheme.colors.background.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${auroraTheme.colors.status.error}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: auroraTheme.colors.text.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  errorBox: {
    width: "100%",
    backgroundColor: `${auroraTheme.colors.status.error}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${auroraTheme.colors.status.error}30`,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: auroraTheme.colors.status.error,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  errorMessage: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
    fontFamily: "monospace",
  },
  stackContainer: {
    width: "100%",
    maxHeight: 150,
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  stackTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: auroraTheme.colors.text.tertiary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  stack: {
    fontSize: 10,
    color: auroraTheme.colors.text.secondary,
    fontFamily: "monospace",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: auroraTheme.colors.primary[500],
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: `${auroraTheme.colors.primary[500]}15`,
  },
  secondaryButtonText: {
    color: auroraTheme.colors.primary[500],
    fontSize: 16,
    fontWeight: "600",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  outlineButtonText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default StaffCrashScreen;
