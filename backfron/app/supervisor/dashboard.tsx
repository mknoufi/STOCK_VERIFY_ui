import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAutoLogout } from "../../src/hooks/useAutoLogout";
import api, { getSessions, searchItems } from "../../src/services/api/api";
import { SupervisorLayout } from "../../src/components/layout/SupervisorLayout";
import OnlineStatus from "../../src/components/ui/OnlineStatus";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

// Types
interface Session {
  id: string;
  warehouse: string;
  status: "OPEN" | "CLOSED" | "RECONCILE";
  started_at: string;
  ended_at?: string;
  staff_name?: string;
  total_items: number;
  total_variance: number;
  notes?: string;
}

interface DashboardStats {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  reconciledSessions: number;
  totalItems: number;
  totalVariance: number;
  positiveVariance: number;
  negativeVariance: number;
  avgVariancePerSession: number;
  highRiskSessions: number;
}

export default function SupervisorDashboard() {
  const router = useRouter();

  useAutoLogout();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    reconciledSessions: 0,
    totalItems: 0,
    totalVariance: 0,
    positiveVariance: 0,
    negativeVariance: 0,
    avgVariancePerSession: 0,
    highRiskSessions: 0,
  });

  // Modal States
  const [showMRPModal, setShowMRPModal] = useState(false);

  // MRP Update States
  const [mrpSearchQuery, setMrpSearchQuery] = useState("");
  const [mrpSearchResults, setMrpSearchResults] = useState<any[]>([]);
  const [mrpLoading, setMrpLoading] = useState(false);
  const [selectedItemForMRP, setSelectedItemForMRP] = useState<any>(null);
  const [newMRP, setNewMRP] = useState("");
  const [isMRPUpdating, setIsMRPUpdating] = useState(false);

  // Filter States - Constants for now as setters were unused
  const filterStatus = "ALL";

  // Bulk Operations State
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set(),
  );

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      // Use service function instead of direct API
      // Fetching first 50 sessions for dashboard overview
      const response = await getSessions(1, 50);

      let filteredSessions = response.items || [];

      if (filterStatus !== "ALL") {
        filteredSessions = filteredSessions.filter(
          (s: Session) => s.status === filterStatus,
        );
      }

      filteredSessions.sort((a: Session, b: Session) => {
        const comparison =
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        return -comparison; // Always desc
      });

      setSessions(filteredSessions);

      const newStats = filteredSessions.reduce(
        (acc: DashboardStats, session: Session) => {
          acc.totalSessions++;
          if (session.status === "OPEN") acc.openSessions++;
          if (session.status === "CLOSED") acc.closedSessions++;
          if (session.status === "RECONCILE") acc.reconciledSessions++;

          acc.totalItems += session.total_items || 0;
          acc.totalVariance += session.total_variance || 0;

          if ((session.total_variance || 0) > 0)
            acc.positiveVariance += session.total_variance;
          if ((session.total_variance || 0) < 0)
            acc.negativeVariance += session.total_variance;

          if (Math.abs(session.total_variance) > 1000) acc.highRiskSessions++;

          return acc;
        },
        {
          totalSessions: 0,
          openSessions: 0,
          closedSessions: 0,
          reconciledSessions: 0,
          totalItems: 0,
          totalVariance: 0,
          positiveVariance: 0,
          negativeVariance: 0,
          avgVariancePerSession: 0,
          highRiskSessions: 0,
        },
      );

      newStats.avgVariancePerSession =
        newStats.totalSessions > 0
          ? newStats.totalVariance / newStats.totalSessions
          : 0;

      setStats(newStats);
    } catch (e) {
      console.error("Dashboard load error:", e);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Dependencies are constants

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearchMRP = async () => {
    if (!mrpSearchQuery.trim()) return;

    try {
      setMrpLoading(true);
      const results = await searchItems(mrpSearchQuery);
      setMrpSearchResults(results);
    } catch {
      Alert.alert("Error", "Failed to search items");
    } finally {
      setMrpLoading(false);
    }
  };

  const updateItemMRP = async () => {
    if (!selectedItemForMRP || !newMRP) return;

    try {
      setIsMRPUpdating(true);
      await api.post("/supervisor/update-mrp", {
        item_code: selectedItemForMRP.item_code,
        new_mrp: parseFloat(newMRP),
      });

      Alert.alert("Success", "MRP updated successfully");
      setSelectedItemForMRP(null);
      setNewMRP("");
      setMrpSearchResults([]);
      setMrpSearchQuery("");
      setShowMRPModal(false);
    } catch {
      Alert.alert("Error", "Failed to update MRP");
    } finally {
      setIsMRPUpdating(false);
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    const newSelection = new Set(selectedSessions);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      newSelection.add(sessionId);
    }
    setSelectedSessions(newSelection);
  };

  return (
    <SupervisorLayout title="Dashboard" screenVariant="default">
      <View style={styles.headerExtension}>
        <View style={styles.onlineStatusContainer}>
          <OnlineStatus />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
        >
          <View style={styles.quickActions}>
            <PremiumButton
              title="Update MRP"
              onPress={() => setShowMRPModal(true)}
              variant="secondary"
              size="small"
              icon="pricetag-outline"
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={modernColors.primary[500]}
          />
        }
      >
        <View style={styles.statsContainer}>
          <PremiumCard variant="elevated" style={styles.statCard}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: modernColors.success.light },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={24}
                color={modernColors.success.dark}
              />
            </View>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </PremiumCard>
          <PremiumCard variant="elevated" style={styles.statCard}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: modernColors.error.light },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={24}
                color={modernColors.error.dark}
              />
            </View>
            <Text style={styles.statValue}>
              {stats.totalVariance.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Variance</Text>
          </PremiumCard>
          <PremiumCard variant="elevated" style={styles.statCard}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: modernColors.primary[100] },
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={24}
                color={modernColors.primary[700]}
              />
            </View>
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items Counted</Text>
          </PremiumCard>
          <PremiumCard variant="elevated" style={styles.statCard}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: modernColors.warning.light },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={24}
                color={modernColors.warning.dark}
              />
            </View>
            <Text style={styles.statValue}>{stats.openSessions}</Text>
            <Text style={styles.statLabel}>Open Sessions</Text>
          </PremiumCard>
        </View>

        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>

          {loading && !refreshing ? (
            <ActivityIndicator
              size="large"
              color={modernColors.primary[500]}
              style={{ marginTop: 20 }}
            />
          ) : sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={modernColors.text.tertiary}
              />
              <Text style={styles.emptyText}>No sessions found</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => router.push(`/supervisor/session/${session.id}`)}
                onLongPress={() => toggleSessionSelection(session.id)}
                activeOpacity={0.7}
              >
                <PremiumCard
                  variant={
                    selectedSessions.has(session.id) ? "outlined" : "elevated"
                  }
                  style={[
                    styles.sessionCard,
                    Math.abs(session.total_variance) > 1000 &&
                      styles.sessionCardHighRisk,
                    selectedSessions.has(session.id) &&
                      styles.sessionCardSelected,
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <View>
                      <Text style={styles.sessionWarehouse}>
                        {session.warehouse}
                      </Text>
                      <Text style={styles.sessionStaff}>
                        Staff: {session.staff_name || "Unknown"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            session.status === "OPEN"
                              ? modernColors.warning.light
                              : session.status === "CLOSED"
                                ? modernColors.success.light
                                : modernColors.info.light,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              session.status === "OPEN"
                                ? modernColors.warning.dark
                                : session.status === "CLOSED"
                                  ? modernColors.success.dark
                                  : modernColors.info.dark,
                          },
                        ]}
                      >
                        {session.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sessionDate}>
                    Started: {new Date(session.started_at).toLocaleDateString()}
                  </Text>

                  <View style={styles.sessionStats}>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="cube-outline"
                        size={16}
                        color={modernColors.text.secondary}
                      />
                      <Text style={styles.statText}>
                        {session.total_items} items
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="analytics-outline"
                        size={16}
                        color={modernColors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.statText,
                          Math.abs(session.total_variance) > 0 &&
                            styles.varianceText,
                        ]}
                      >
                        Var: {session.total_variance}
                      </Text>
                    </View>
                  </View>
                </PremiumCard>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={showMRPModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMRPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update MRP</Text>
              <TouchableOpacity onPress={() => setShowMRPModal(false)}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={modernColors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            <PremiumInput
              label="Search Item"
              placeholder="Enter item name or code..."
              value={mrpSearchQuery}
              onChangeText={setMrpSearchQuery}
              onSubmitEditing={handleSearchMRP}
              rightIcon="search"
            />
            <PremiumButton
              title="Search"
              onPress={handleSearchMRP}
              loading={mrpLoading}
              style={{ marginTop: modernSpacing.md }}
            />

            {/* Results would be rendered here */}
            {mrpSearchResults.length > 0 && (
              <ScrollView
                style={{ maxHeight: 200, marginTop: modernSpacing.md }}
              >
                {mrpSearchResults.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => setSelectedItemForMRP(item)}
                  >
                    <Text style={styles.resultItemName}>{item.item_name}</Text>
                    <Text style={styles.resultItemCode}>{item.item_code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedItemForMRP && (
              <View style={{ marginTop: modernSpacing.lg }}>
                <Text style={styles.selectedItemText}>
                  Selected: {selectedItemForMRP.item_name}
                </Text>
                <PremiumInput
                  label="New MRP"
                  value={newMRP}
                  onChangeText={setNewMRP}
                  keyboardType="numeric"
                  placeholder="Enter new MRP"
                />
                <PremiumButton
                  title="Update MRP"
                  onPress={updateItemMRP}
                  loading={isMRPUpdating}
                  style={{ marginTop: modernSpacing.md }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SupervisorLayout>
  );
}

const styles = StyleSheet.create({
  headerExtension: {
    paddingHorizontal: modernSpacing.screenPadding,
    paddingBottom: modernSpacing.md,
  },
  onlineStatusContainer: {
    marginBottom: modernSpacing.sm,
  },
  quickActionsScroll: {
    flexGrow: 0,
  },
  quickActions: {
    flexDirection: "row",
    gap: modernSpacing.sm,
  },
  actionButton: {
    marginRight: modernSpacing.sm,
    minWidth: 100,
  },
  scrollContent: {
    flex: 1,
    padding: modernSpacing.screenPadding,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.xl,
  },
  statCard: {
    width: "47%", // Slightly less than 50% to account for gap
    alignItems: "center",
    padding: modernSpacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  statValue: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginTop: modernSpacing.xs,
  },
  statLabel: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    textAlign: "center",
  },
  sessionsSection: {
    marginBottom: 100,
  },
  sectionTitle: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
  },
  sessionCard: {
    marginBottom: modernSpacing.md,
  },
  sessionCardHighRisk: {
    borderColor: modernColors.error.main,
    borderWidth: 1,
  },
  sessionCardSelected: {
    borderColor: modernColors.primary[500],
    borderWidth: 2,
    backgroundColor: modernColors.primary[50],
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: modernSpacing.sm,
  },
  sessionWarehouse: {
    ...modernTypography.body.large,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  sessionStaff: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: modernBorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  sessionDate: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    marginBottom: modernSpacing.md,
  },
  sessionStats: {
    flexDirection: "row",
    gap: modernSpacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  varianceText: {
    color: modernColors.warning.main,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: modernSpacing.xl,
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: modernSpacing.lg,
  },
  modalContainer: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.lg,
    maxHeight: "80%",
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: "center",
        width: "100%",
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  },
  modalTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
  },
  searchResultItem: {
    padding: modernSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  resultItemName: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  resultItemCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  selectedItemText: {
    ...modernTypography.body.large,
    color: modernColors.primary[700],
    marginBottom: modernSpacing.md,
    fontWeight: "600",
  },
});
