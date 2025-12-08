import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SupervisorLayout } from "../../src/components/layout/SupervisorLayout";
import { getWatchtowerStats } from "../../src/services/api/api";

interface WatchtowerStats {
  active_sessions: number;
  total_scans_today: number;
  active_users: number;
  hourly_throughput: number[];
  recent_activity: {
    item_code: string;
    qty: number;
    user: string;
    time: string;
  }[];
}

const ChartBar = ({
  height,
  label,
  active,
}: {
  height: number;
  label: string;
  active?: boolean;
}) => (
  <View style={styles.chartBarContainer}>
    <View
      style={[
        styles.chartBar,
        {
          height: Math.max(height, 4),
          backgroundColor: active ? "#4CAF50" : "rgba(255,255,255,0.2)",
        },
      ]}
    />
    <Text style={styles.chartLabel}>{label}</Text>
  </View>
);

export default function WatchtowerScreen() {
  const [stats, setStats] = useState<WatchtowerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const data = await getWatchtowerStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch watchtower stats", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const getProcessingRate = () => {
    if (!stats) return 0;
    // Simple throughput calculation (items / hour avg for active hours)
    const total = stats.total_scans_today;
    const currentHour = new Date().getHours();
    // Avoid division by zero, assume at least 1 hour operating if count > 0
    return currentHour > 0 ? Math.round(total / currentHour) : total;
  };

  return (
    <SupervisorLayout title="Watchtower" screenVariant="default" showBack>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
      >
        {/* Live Indicator Header */}
        <View style={styles.header}>
          <View style={styles.liveIndicatorContainer}>
            <View style={[styles.liveDot, { opacity: loading ? 0.5 : 1 }]} />
            <Text style={styles.liveText}>LIVE MONITORING</Text>
          </View>
          <Text style={styles.lastUpdatedText}>Updated: {lastUpdated.toLocaleTimeString()}</Text>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Connecting to Watchtower...</Text>
          </View>
        ) : stats ? (
          <>
            {/* Primary Metrics Grid */}
            <View style={styles.gridContainer}>
              <View style={[styles.card, styles.cardGlass]}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="people" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.cardValue}>{stats.active_users}</Text>
                <Text style={styles.cardLabel}>Active Staff</Text>
              </View>

              <View style={[styles.card, styles.cardGlass]}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="folder-open" size={24} color="#2196F3" />
                </View>
                <Text style={styles.cardValue}>{stats.active_sessions}</Text>
                <Text style={styles.cardLabel}>Open Sessions</Text>
              </View>

              <View style={[styles.card, styles.cardGlass]}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="scan-circle" size={24} color="#FF9800" />
                </View>
                <Text style={styles.cardValue}>{stats.total_scans_today}</Text>
                <Text style={styles.cardLabel}>Total Scans Today</Text>
              </View>

              <View style={[styles.card, styles.cardGlass]}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="speedometer" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.cardValue}>{getProcessingRate()}</Text>
                <Text style={styles.cardLabel}>Avg Items/Hr</Text>
              </View>
            </View>

            {/* Throughput Chart */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Hourly Throughput</Text>
              <View style={styles.chartContainer}>
                {stats.hourly_throughput.map((count, index) => {
                  // Only show operational hours (e.g., 8 AM to 8 PM) or active hours
                  if (index < 6 || index > 22) return null;
                  const max = Math.max(...stats.hourly_throughput, 10); // Scale base
                  const height = (count / max) * 100;
                  const isCurrentHour = index === new Date().getHours();
                  return (
                    <ChartBar
                      key={index}
                      height={height}
                      label={`${index}:00`}
                      active={isCurrentHour}
                    />
                  );
                })}
              </View>
            </View>

            {/* Recent Activity Feed */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityList}>
                {stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((activity, idx) => (
                    <View key={idx} style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        <Ionicons name="barcode-outline" size={20} color="#fff" />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityMainText}>
                          <Text style={styles.boldText}>{activity.user}</Text> scanned{" "}
                          {activity.qty}x <Text style={styles.boldText}>{activity.item_code}</Text>
                        </Text>
                        <Text style={styles.activityTime}>
                          {new Date(activity.time).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No recent activity</Text>
                )}
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>Failed to load statistics</Text>
        )}
      </ScrollView>
    </SupervisorLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  liveIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.3)",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF453A",
    marginRight: 6,
  },
  liveText: {
    color: "#FF453A",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  lastUpdatedText: {
    color: "#888",
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#888",
    fontSize: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  card: {
    width: "48%",
    backgroundColor: "#1E1E1E", // Fallback
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardGlass: {
    backgroundColor: "rgba(30,30,30,0.8)", // Glass-like
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: "#aaa",
  },
  sectionContainer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    gap: 8,
  },
  chartBarContainer: {
    alignItems: "center",
    flex: 1,
  },
  chartBar: {
    width: "100%",
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: "#666",
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(33, 150, 243, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityMainText: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 2,
  },
  boldText: {
    color: "#fff",
    fontWeight: "600",
  },
  activityTime: {
    color: "#666",
    fontSize: 12,
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  errorText: {
    color: "#FF5252",
    textAlign: "center",
    marginTop: 20,
  },
});
