/**
 * Sync Status Bar Component
 * Shows sync status, queue count, and allows manual sync
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { syncService, SyncStatus } from "../services/sync/syncService";
import { useNetworkStore } from "../services/networkService";

export const SyncStatusBar: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useNetworkStore((state) => state.isOnline);

  const updateStatus = async () => {
    try {
      const status = await syncService.getStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    updateStatus();

    // Poll every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      await syncService.syncAll();
      await updateStatus();
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!syncStatus) return null;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.indicatorContainer}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isOnline ? "#4CAF50" : "#F44336" },
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        {syncStatus.pendingOperations > 0 && (
          <Text style={styles.pendingText}>
            {syncStatus.pendingOperations} item(s) pending
          </Text>
        )}

        {syncStatus.conflicts > 0 && (
          <View style={styles.conflictContainer}>
            <Ionicons name="warning" size={14} color="#ffd700" />
            <Text style={styles.conflictText}>
              {syncStatus.conflicts} Conflict
              {syncStatus.conflicts > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Sync button */}
      {isOnline && syncStatus.pendingOperations > 0 && (
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="sync" size={16} color="#fff" />
          )}
          <Text style={styles.syncButtonText}>
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Last sync time */}
      {syncStatus.lastSync && syncStatus.pendingOperations === 0 && (
        <Text style={styles.lastSyncText}>
          Last: {new Date(syncStatus.lastSync).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2196F3",
    padding: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  offlineContainer: {
    backgroundColor: "#f44336",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.9,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  queueRow: {
    flex: 1,
  },
  queueText: {
    color: "#fff",
    fontSize: 12,
  },
  syncButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  resultRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  successText: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "600",
  },
  errorText: {
    color: "#ffeb3b",
    fontSize: 11,
    fontWeight: "600",
  },
  lastSyncText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
  },
  conflictContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  conflictText: {
    color: "#ffd700",
    fontSize: 12,
    fontWeight: "bold",
  },
});
