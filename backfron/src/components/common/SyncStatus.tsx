import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  syncService,
  SyncStatus as ServiceSyncStatus,
} from "../../services/sync/syncService";
import { useTheme } from "../../hooks/useTheme";

export const SyncStatus = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<ServiceSyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    errors: [],
    conflicts: 0,
  });
  const [spinValue] = useState(new Animated.Value(0));

  useEffect(() => {
    // Initial status
    syncService.getStatus().then(setStatus);

    // Subscribe to updates
    const unsubscribe = syncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status.isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [status.isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (
    status.pendingOperations === 0 &&
    !status.isSyncing &&
    status.errors.length === 0
  ) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={() => syncService.syncAll()}
      disabled={status.isSyncing}
    >
      <View style={styles.content}>
        {status.isSyncing ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={20} color={theme.colors.primary} />
          </Animated.View>
        ) : status.errors.length > 0 ? (
          <Ionicons name="warning" size={20} color={theme.colors.error} />
        ) : (
          <Ionicons
            name="cloud-upload"
            size={20}
            color={theme.colors.textSecondary}
          />
        )}

        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: theme.colors.text }]}>
            {status.isSyncing
              ? "Syncing..."
              : status.errors.length > 0
                ? "Sync Failed"
                : `${status.pendingOperations} Pending`}
          </Text>
          {status.lastSync && !status.isSyncing && (
            <Text
              style={[
                styles.lastSyncText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Last: {new Date(status.lastSync).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    marginLeft: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  lastSyncText: {
    fontSize: 10,
  },
});
