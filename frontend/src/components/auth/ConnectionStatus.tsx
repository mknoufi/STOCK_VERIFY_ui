/**
 * Connection Status Indicator
 *
 * Shows Wi-Fi and Server connection status
 * Part of the UX requirements for persistent indicators
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { modernColors, modernTypography, modernSpacing } from "../../styles/modernDesignSystem";

interface ConnectionStatusProps {
  isOnline: boolean;
  serverReachable: boolean | null; // null = checking
  compact?: boolean;
}

export function ConnectionStatus({
  isOnline,
  serverReachable,
  compact = false,
}: ConnectionStatusProps) {
  const getServerStatus = () => {
    if (serverReachable === null) return "checking";
    return serverReachable ? "connected" : "disconnected";
  };

  const serverStatus = getServerStatus();

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons
          name={isOnline ? "wifi" : "wifi-outline"}
          size={16}
          color={isOnline ? modernColors.semantic.success : modernColors.semantic.error}
        />
        {serverStatus === "checking" ? (
          <ActivityIndicator size="small" color={modernColors.text.secondary} />
        ) : (
          <Ionicons
            name={serverStatus === "connected" ? "server" : "server-outline"}
            size={16}
            color={
              serverStatus === "connected"
                ? modernColors.semantic.success
                : modernColors.semantic.error
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wi-Fi Status */}
      <View style={styles.statusItem}>
        <View
          style={[
            styles.statusDot,
            isOnline ? styles.statusDotSuccess : styles.statusDotError,
          ]}
        />
        <Ionicons
          name={isOnline ? "wifi" : "wifi-outline"}
          size={18}
          color={isOnline ? modernColors.semantic.success : modernColors.semantic.error}
        />
        <Text
          style={[
            styles.statusText,
            isOnline ? styles.statusTextSuccess : styles.statusTextError,
          ]}
        >
          {isOnline ? "Connected" : "Offline"}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Server Status */}
      <View style={styles.statusItem}>
        {serverStatus === "checking" ? (
          <>
            <ActivityIndicator
              size="small"
              color={modernColors.text.secondary}
              style={styles.statusLoader}
            />
            <Ionicons
              name="server-outline"
              size={18}
              color={modernColors.text.secondary}
            />
            <Text style={[styles.statusText, styles.statusTextChecking]}>
              Checking...
            </Text>
          </>
        ) : (
          <>
            <View
              style={[
                styles.statusDot,
                serverStatus === "connected"
                  ? styles.statusDotSuccess
                  : styles.statusDotError,
              ]}
            />
            <Ionicons
              name={serverStatus === "connected" ? "server" : "server-outline"}
              size={18}
              color={
                serverStatus === "connected"
                  ? modernColors.semantic.success
                  : modernColors.semantic.error
              }
            />
            <Text
              style={[
                styles.statusText,
                serverStatus === "connected"
                  ? styles.statusTextSuccess
                  : styles.statusTextError,
              ]}
            >
              {serverStatus === "connected" ? "Server OK" : "Server Down"}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    gap: modernSpacing.sm,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotSuccess: {
    backgroundColor: modernColors.semantic.success,
  },
  statusDotError: {
    backgroundColor: modernColors.semantic.error,
  },
  statusLoader: {
    marginRight: 2,
  },
  statusText: {
    ...modernTypography.label.small,
    fontWeight: "500",
  },
  statusTextSuccess: {
    color: modernColors.semantic.success,
  },
  statusTextError: {
    color: modernColors.semantic.error,
  },
  statusTextChecking: {
    color: modernColors.text.secondary,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 4,
  },
});
