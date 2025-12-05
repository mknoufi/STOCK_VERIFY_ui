import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { flags } from "../../src/constants/flags";
import { getOfflineQueue } from "../../src/services/offline/offlineStorage";
import { syncService } from "../../src/services/sync/syncService";

export default function OfflineQueueScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [queue, setQueue] = React.useState<any[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    if (!flags.enableOfflineQueue) return;
    setLoading(true);
    try {
      const q = await getOfflineQueue();
      const status = await syncService.getStatus();
      setQueue(q);
      setErrors(status.errors);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    // Subscribe to sync service updates
    const unsubscribe = syncService.subscribe(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  if (!flags.enableOfflineQueue) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Offline Queue is disabled in flags.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Offline Queue</Text>
        <Pressable
          onPress={() =>
            syncService
              .processOfflineQueue()
              .then(load)
              .catch(() => {})
          }
          style={styles.navBtn}
        >
          <Text style={styles.navText}>Flush</Text>
        </Pressable>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Queued Mutations ({queue.length})
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.muted}>No queued mutations</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {String(item.type).toUpperCase()}
            </Text>
            <Text style={styles.cardMeta}>
              Created: {new Date(item.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.cardDetail} numberOfLines={2}>
              Data: {JSON.stringify(item.data)}
            </Text>
            <Text style={styles.cardMeta}>Retries: {item.retries}</Text>
          </View>
        )}
      />

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Sync Errors ({errors.length})
      </Text>
      <FlatList
        data={errors}
        keyExtractor={(item, index) => `error-${index}`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={<Text style={styles.muted}>No sync errors</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: "#EF4444" }]}>
            <Text style={[styles.cardDetail, { color: "#EF4444" }]}>
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0f1216" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#E0E0E0", fontSize: 18, fontWeight: "700" },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1e293b",
    borderRadius: 6,
  },
  navText: { color: "#E0E0E0", fontSize: 12, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: "#9CA3AF" },
  sectionTitle: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#374151",
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardMeta: { color: "#9CA3AF", fontSize: 12 },
  cardDetail: { color: "#CBD5E1", fontSize: 12, marginTop: 8 },
});
