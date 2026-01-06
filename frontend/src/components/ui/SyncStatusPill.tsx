/**
 * SyncStatusPill Component
 * Modern, unified status indicator for synchronization state
 */

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { getSyncStatus, forceSync } from "../../services/syncManager";
import { useNetworkStore } from "../../store/networkStore";
import {
  modernColors,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";

interface SyncStatus {
  isOnline: boolean;
  queuedOperations: number;
  lastSync: string | null;
  cacheSize: number;
  needsSync: boolean;
}

export const SyncStatusPill = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useNetworkStore((state: any) => state.isOnline);

  // Animation for sync rotation
  const rotation = useSharedValue(0);

  const loadStatus = async () => {
    try {
      const s = await getSyncStatus();
      setStatus(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleSync = async () => {
    if (!status?.isOnline || isSyncing) return;

    setIsSyncing(true);
    rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1);

    try {
      await forceSync();
      await loadStatus();
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
      rotation.value = 0;
    }
  };

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  if (!status) return null;

  // Determine state
  const isOffline = !status.isOnline;
  const hasPending = status.queuedOperations > 0;

  let pillColor = modernColors.success.main;
  let pillBg = "rgba(34, 197, 94, 0.15)"; // Green bg
  let iconName: keyof typeof Ionicons.glyphMap = "cloud-done";
  let label = "Synced";

  if (isOffline) {
    pillColor = modernColors.warning.main;
    pillBg = "rgba(234, 179, 8, 0.15)";
    iconName = "cloud-offline";
    label = hasPending ? `Offline (${status.queuedOperations})` : "Offline";
  } else if (isSyncing) {
    pillColor = modernColors.primary[400];
    pillBg = "rgba(99, 102, 241, 0.15)";
    iconName = "sync";
    label = "Syncing...";
  } else if (hasPending) {
    pillColor = modernColors.warning.main;
    pillBg = "rgba(234, 179, 8, 0.15)";
    iconName = "cloud-upload";
    label = `${status.queuedOperations} Pending`;
  }

  return (
    <TouchableOpacity
      onPress={handleSync}
      disabled={isOffline || isSyncing || (!hasPending && !isOffline)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: pillBg, borderColor: pillColor },
        ]}
      >
        <Animated.View style={isSyncing ? animatedIconStyle : undefined}>
          <Ionicons name={iconName} size={14} color={pillColor} />
        </Animated.View>
        <Text style={[styles.label, { color: pillColor }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: modernBorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
