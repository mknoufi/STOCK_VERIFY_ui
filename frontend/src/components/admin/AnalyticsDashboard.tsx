import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import apiClient from "../../services/httpClient";
import { Ionicons } from "@expo/vector-icons";

interface AnalyticsData {
  stats: {
    total_verifications: number;
    total_items: number;
    avg_variance: number;
    accuracy_rate: number;
    surplus_count: number;
    shortage_count: number;
    top_users: { _id: string; count: number }[];
    trends: { _id: string; count: number }[];
  };
  category_distribution: { _id: string; count: number }[];
  period_days: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);

  const fetchAnalytics = async (period: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/reports/analytics?days=${period}`,
      );
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(days);
  }, [days]);

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Analytics
        </Text>
        <View style={styles.periodSelector}>
          {[7, 30, 90].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setDays(p)}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    days === p ? theme.colors.accent : theme.colors.surface,
                },
              ]}
            >
              <Text style={{ color: days === p ? "#fff" : theme.colors.text }}>
                {p}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {data && (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Scans"
              value={data.stats.total_verifications}
              icon="barcode-outline"
              color="#4CAF50"
            />
            <StatCard
              title="Accuracy"
              value={`${data.stats.accuracy_rate.toFixed(1)}%`}
              icon="shield-checkmark-outline"
              color="#2196F3"
            />
            <StatCard
              title="Surplus"
              value={data.stats.surplus_count}
              icon="add-circle-outline"
              color="#FF9800"
            />
            <StatCard
              title="Shortage"
              value={data.stats.shortage_count}
              icon="remove-circle-outline"
              color="#F44336"
            />
          </View>

          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Top Performers
            </Text>
            {data.stats.top_users.map((user, index) => (
              <View key={user._id} style={styles.userRow}>
                <Text style={{ color: theme.colors.text }}>
                  {index + 1}. {user._id}
                </Text>
                <Text
                  style={[styles.userCount, { color: theme.colors.accent }]}
                >
                  {user.count}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Category Distribution
            </Text>
            {data.category_distribution.map((cat) => (
              <View key={cat._id} style={styles.barContainer}>
                <Text style={[styles.barLabel, { color: theme.colors.text }]}>
                  {cat._id}
                </Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(cat.count / data.stats.total_verifications) * 100}%`,
                        backgroundColor: theme.colors.accent,
                      },
                    ]}
                  />
                  <Text style={styles.barValue}>{cat.count}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const StatCard = ({ title, value, icon, color }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.cardValue, { color: theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  card: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  userCount: {
    fontWeight: "bold",
  },
  barContainer: {
    marginBottom: 12,
  },
  barLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  barWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
  },
  barValue: {
    position: "absolute",
    right: 8,
    fontSize: 10,
    fontWeight: "bold",
  },
});
