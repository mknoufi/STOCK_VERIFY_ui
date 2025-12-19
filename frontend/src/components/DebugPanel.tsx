import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { flags } from "../constants/flags";
import { useAuthStore } from "../store/authStore";
import { useNetworkStore } from "../services/networkService";
import { getBackendURL } from "../services/backendUrl";
import {
  getQueueCount,
  getConflictsCount,
  flushOfflineQueue,
} from "../services/offlineQueue";

import api from "../services/httpClient";

export const DebugPanel: React.FC = () => {
  const { user } = useAuthStore();
  const net = useNetworkStore();
  const [queued, setQueued] = React.useState<number>(0);
  const [conflicts, setConflicts] = React.useState<number>(0);

  React.useEffect(() => {
    if (!flags.enableOfflineQueue) return;
    let mounted = true;
    const update = async () => {
      try {
        const [q, c] = await Promise.all([
          getQueueCount(),
          getConflictsCount(),
        ]);
        if (mounted) {
          setQueued(q);
          setConflicts(c);
        }
      } catch {}
    };
    update();
    const id = setInterval(update, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
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
      {flags.enableOfflineQueue && (
        <>
          <Text style={styles.line}>
            Queued: {queued} | Conflicts: {conflicts}
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => flushOfflineQueue(api).catch(() => {})}
            pointerEvents="auto"
          >
            <Text style={styles.buttonText}>Flush Offline Queue</Text>
          </Pressable>
        </>
      )}
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
