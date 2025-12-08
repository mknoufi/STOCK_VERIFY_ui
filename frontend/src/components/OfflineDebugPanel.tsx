import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  getCacheStats,
  clearAllCache,
  getOfflineQueue,
} from "../services/offline/offlineStorage";
import { syncOfflineQueue } from "../services/api";
import { useNetworkStore } from "../store/networkStore";

export const OfflineDebugPanel: React.FC = () => {
  const [stats, setStats] = React.useState({
    itemsCount: 0,
    queuedOperations: 0,
    sessionsCount: 0,
    countLinesCount: 0,
    lastSync: null as string | null,
  });
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<any>(null);
  const { isOnline, connectionType } = useNetworkStore();

  const loadStats = React.useCallback(async () => {
    const cacheStats = await getCacheStats();
    setStats(cacheStats);
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleSync = async () => {
    if (!isOnline) {
      alert("Cannot sync while offline");
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncOfflineQueue();
      setSyncResult(result);
      await loadStats();
    } catch (error: any) {
      setSyncResult({ error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear all offline data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAllCache();
            await loadStats();
            setSyncResult(null);
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ],
    );
  };

  const handleViewQueue = async () => {
    const queue = await getOfflineQueue();
    console.log("Offline Queue:", JSON.stringify(queue, null, 2));
    alert(`Check console for queue details.${queue.length} items in queue.`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Offline Debug Panel</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Status</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text
            style={[styles.value, { color: isOnline ? "#4CAF50" : "#FF6B6B" }]}
          >
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Connection:</Text>
          <Text style={styles.value}>{connectionType}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Cached Items:</Text>
          <Text style={styles.value}>{stats.itemsCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cached Sessions:</Text>
          <Text style={styles.value}>{stats.sessionsCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Count Lines:</Text>
          <Text style={styles.value}>{stats.countLinesCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Queued Operations:</Text>
          <Text
            style={[
              styles.value,
              { color: stats.queuedOperations > 0 ? "#FFA500" : "#4CAF50" },
            ]}
          >
            {stats.queuedOperations}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last Sync:</Text>
          <Text style={styles.value}>
            {stats.lastSync
              ? new Date(stats.lastSync).toLocaleString()
              : "Never"}
          </Text>
        </View>
      </View>

      {syncResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Sync Result</Text>
          {syncResult.error ? (
            <Text style={[styles.value, { color: "#FF6B6B" }]}>
              Error: {syncResult.error}
            </Text>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Total:</Text>
                <Text style={styles.value}>{syncResult.total}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Success:</Text>
                <Text style={[styles.value, { color: "#4CAF50" }]}>
                  {syncResult.success}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Failed:</Text>
                <Text style={[styles.value, { color: "#FF6B6B" }]}>
                  {syncResult.failed}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.syncButton,
            (!isOnline || syncing) && styles.buttonDisabled,
          ]}
          onPress={handleSync}
          disabled={!isOnline || syncing}
        >
          <Text style={styles.buttonText}>
            {syncing ? "Syncing..." : "Sync Now"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.viewButton]}
          onPress={handleViewQueue}
        >
          <Text style={styles.buttonText}>View Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  section: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  syncButton: {
    backgroundColor: "#4CAF50",
  },
  viewButton: {
    backgroundColor: "#2196F3",
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OfflineDebugPanel;
