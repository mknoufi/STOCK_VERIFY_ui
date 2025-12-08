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
import {
  flushOfflineQueue,
  getConflicts,
  resolveConflict,
  listQueue,
} from "../../src/services/offline/offlineQueue";

import api from "../../src/services/httpClient";

export default function OfflineQueueScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [queue, setQueue] = React.useState<any[]>([]);
  const [conflicts, setConflicts] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    if (!flags.enableOfflineQueue) return;
    setLoading(true);
    try {
      const [q, c] = await Promise.all([listQueue(), getConflicts()]);
      setQueue(q);
      setConflicts(c);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
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
            flushOfflineQueue(api)
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
              {String(item.method).toUpperCase()} {item.url}
            </Text>
            <Text style={styles.cardMeta}>
              Created: {new Date(item.createdAt).toLocaleString()}
            </Text>
            {item.params && (
              <Text style={styles.cardDetail} numberOfLines={2}>
                Params: {JSON.stringify(item.params)}
              </Text>
            )}
            {item.data && (
              <Text style={styles.cardDetail} numberOfLines={2}>
                Data: {JSON.stringify(item.data)}
              </Text>
            )}
          </View>
        )}
      />

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Conflicts ({conflicts.length})
      </Text>
      <FlatList
        data={conflicts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={<Text style={styles.muted}>No conflicts</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {String(item.method).toUpperCase()} {item.url}
            </Text>
            <Text style={styles.cardMeta}>
              At: {new Date(item.timestamp || item.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.cardDetail} numberOfLines={4}>
              {typeof item.detail === "string"
                ? item.detail
                : JSON.stringify(item.detail)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => resolveConflict(item.id).then(load)}
                style={styles.navBtn}
              >
                <Text style={styles.navText}>Dismiss</Text>
              </Pressable>
            </View>
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
