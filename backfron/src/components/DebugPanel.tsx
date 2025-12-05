import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";

import { useAuthStore } from "../store/authStore";
import { useNetworkStore } from "../services/networkService";
import { getBackendURL } from "../utils/backendUrl";
import { syncService } from "../services/sync/syncService";

export const DebugPanel: React.FC = () => {
  const { user } = useAuthStore();
  const net = useNetworkStore();
  const [syncStatus, setSyncStatus] = React.useState<any>({
    pendingOperations: 0,
    errors: [],
  });

  React.useEffect(() => {
    // Initial status
    syncService.getStatus().then(setSyncStatus);
    // Subscribe
    return syncService.subscribe(setSyncStatus);
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Text style={styles.line}>
        ENV: {__DEV__ ? "DEV" : "PROD"} / {Platform.OS}
      </Text>
      <Text style={styles.line}>
        User: {user ? `${user.username} (${user.role})` : "none"}
      </Text>
      <Text style={styles.line}>
        Online: {String(net.isOnline)} / Reachable:{" "}
        {String(net.isInternetReachable)}
      </Text>
      <Text style={styles.line}>Backend: {getBackendURL()}</Text>

      <Text style={styles.line}>
        Pending: {syncStatus.pendingOperations} | Errors:{" "}
        {syncStatus.errors.length}
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => syncService.syncAll().catch(() => {})}
        pointerEvents="auto"
      >
        <Text style={styles.buttonText}>Sync Now</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  line: {
    color: "#9E9E9E",
    fontSize: 11,
  },
  button: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonText: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default DebugPanel;
