/**
 * Modern Staff Home Screen - Lavanya Mart Stock Verify
 * Dashboard for managing stock verification sessions
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../src/store/authStore";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import {
  createSession,
  getZones,
  getWarehouses,
} from "../../src/services/api/api";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { toastService } from "../../src/services/utils/toastService";
import { SessionType } from "../../src/types";

import ModernHeader from "../../src/components/ui/ModernHeader";
import ModernCard from "../../src/components/ui/ModernCard";
import ModernButton from "../../src/components/ui/ModernButton";
import ModernInput from "../../src/components/ui/ModernInput";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../src/theme/modernDesign";

interface Zone {
  id: string;
  zone_name: string;
}

interface Warehouse {
  id: string;
  warehouse_name: string;
}

export default function StaffHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  // Handle Back Button for Exit Confirmation
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Exit App", "Are you sure you want to exit?", [
        {
          text: "Cancel",
          onPress: () => null,
          style: "cancel",
        },
        { text: "YES", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Create Session State
  const [locationType, setLocationType] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [rackName, setRackName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);

  const { setActiveSession, setFloor, setRack } = useScanSessionStore();

  // Queries
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    refetch,
  } = useSessionsQuery({
    page: 1,
    pageSize: SESSION_PAGE_SIZE,
  });

  const sessions = useMemo(
    () => (Array.isArray(sessionsData?.items) ? sessionsData.items : []),
    [sessionsData?.items],
  );

  const activeSessions = useMemo(() => {
    return sessions
      .filter((s: any) => {
        const status = String(s.status || "OPEN")
          .trim()
          .toUpperCase();
        return status === "OPEN" || status === "ACTIVE";
      })
      .sort((a: any, b: any) => {
        const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
        const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });
  }, [sessions]);

  const finishedSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      const status = String(s.status || "")
        .trim()
        .toUpperCase();
      return (
        status === "CLOSED" || status === "COMPLETED" || status === "RECONCILE"
      );
    });
  }, [sessions]);

  // Fetch Zones
  useEffect(() => {
    const fetchZones = async () => {
      const fallbackZones = [
        { zone_name: "Showroom", id: "zone_showroom" },
        { zone_name: "Godown", id: "zone_godown" },
      ];
      setZones(fallbackZones);

      try {
        setIsLoadingZones(true);
        const data = await getZones();
        if (Array.isArray(data) && data.length > 0) {
          setZones(data);
        }
      } catch (error) {
        // Silent fail, use fallback
      } finally {
        setIsLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  // Fetch Warehouses when location type changes
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!locationType) return;

      // Set fallback immediately
      let fallback: Warehouse[] = [];
      if (locationType.toLowerCase().includes("showroom")) {
        fallback = [
          { warehouse_name: "Ground Floor", id: "fl_ground" },
          { warehouse_name: "First Floor", id: "fl_first" },
          { warehouse_name: "Second Floor", id: "fl_second" },
        ];
      } else {
        fallback = [
          { warehouse_name: "Main Godown", id: "wh_main" },
          { warehouse_name: "Top Godown", id: "wh_top" },
          { warehouse_name: "Damage Area", id: "wh_damage" },
        ];
      }
      setWarehouses(fallback);

      try {
        const data = await getWarehouses(locationType);
        if (Array.isArray(data) && data.length > 0) {
          setWarehouses(data);
        }
      } catch (error) {
        // Silent fail, use fallback
      }
    };
    fetchWarehouses();
  }, [locationType]);

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleStartSession = async () => {
    if (!locationType || !selectedFloor || !rackName.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    const trimmedRack = rackName.trim();
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedRack)) {
      Alert.alert(
        "Invalid Rack Name",
        "Only letters, numbers, dashes, and underscores allowed",
      );
      return;
    }

    const warehouseName = `${locationType} - ${selectedFloor} - ${trimmedRack.toUpperCase()}`;

    try {
      setIsCreating(true);
      const session = await createSession({
        warehouse: warehouseName,
        type: "STANDARD",
      });

      // Optimistic update
      queryClient.setQueryData(
        ["sessions", 1, SESSION_PAGE_SIZE],
        (old: any) => ({
          ...old,
          items: [session, ...(old?.items || [])],
        }),
      );

      // Reset and navigate
      setShowCreateModal(false);
      setLocationType(null);
      setSelectedFloor(null);
      setRackName("");

      setFloor(`${locationType} - ${selectedFloor}`);
      setRack(trimmedRack.toUpperCase());
      setActiveSession(session.id, "STANDARD");

      router.push({
        pathname: "/staff/scan",
        params: { sessionId: session.id },
      } as any);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create session";
      toastService.showError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResumeSession = (session: any) => {
    Haptics.selectionAsync();

    if (session.warehouse) {
      const parts = session.warehouse.split(" - ");
      if (parts.length >= 2) {
        const rack = parts.pop();
        const floor = parts.join(" - ");
        setFloor(floor);
        setRack(rack || "");
      } else {
        setFloor(session.warehouse);
        setRack("");
      }
    }

    setActiveSession(session.id || session._id, "STANDARD");
    router.push({
      pathname: "/staff/scan",
      params: { sessionId: session.id || session._id },
    } as any);
  };

  const renderSessionCard = (session: any) => (
    <ModernCard
      key={session.id || session._id}
      style={styles.sessionCard}
      padding={spacing.md}
      onPress={() => handleResumeSession(session)}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionIcon}>
          <Ionicons name="cube-outline" size={24} color={colors.primary[600]} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.warehouseText}>{session.warehouse}</Text>
          <Text style={styles.dateText}>
            {new Date(session.created_at).toLocaleDateString()} •{" "}
            {new Date(session.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </View>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{session.item_count || 0}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  session.discrepancy_count > 0
                    ? colors.error[500]
                    : colors.success[600],
              },
            ]}
          >
            {session.discrepancy_count || 0}
          </Text>
          <Text style={styles.statLabel}>Issues</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{session.status}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>
    </ModernCard>
  );

  const renderContent = () => {
    if (activeTab === "active") {
      return (
        <Animated.View entering={FadeInDown.duration(500)}>
          <ModernButton
            title="Start New Session"
            icon="add-circle-outline"
            onPress={() => setShowCreateModal(true)}
            style={styles.createButton}
          />

          {activeSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="clipboard-outline"
                size={48}
                color={colors.gray[300]}
              />
              <Text style={styles.emptyText}>No active sessions</Text>
              <Text style={styles.emptySubtext}>
                Start a new session to begin scanning
              </Text>
            </View>
          ) : (
            activeSessions.map(renderSessionCard)
          )}
        </Animated.View>
      );
    }

    if (activeTab === "history") {
      return (
        <Animated.View entering={FadeInDown.duration(500)}>
          {finishedSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="time-outline"
                size={48}
                color={colors.gray[300]}
              />
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          ) : (
            finishedSessions.map(renderSessionCard)
          )}
        </Animated.View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ModernHeader
        title="Dashboard"
        subtitle={`Welcome, ${user?.username || "Staff"}`}
        rightAction={{
          icon: "log-out-outline",
          onPress: () => {
            Alert.alert("Logout", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: logout },
            ]);
          },
        }}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Active ({activeSessions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Create Session Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Session</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <Text style={styles.sectionLabel}>Select Location</Text>
            <View style={styles.chipContainer}>
              {zones.map((zone) => (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.chip,
                    locationType === zone.zone_name && styles.chipActive,
                  ]}
                  onPress={() => setLocationType(zone.zone_name)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      locationType === zone.zone_name && styles.chipTextActive,
                    ]}
                  >
                    {zone.zone_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {locationType && (
              <Animated.View entering={FadeInUp}>
                <Text style={styles.sectionLabel}>Select Floor / Area</Text>
                <View style={styles.chipContainer}>
                  {warehouses.map((wh) => (
                    <TouchableOpacity
                      key={wh.id}
                      style={[
                        styles.chip,
                        selectedFloor === wh.warehouse_name &&
                          styles.chipActive,
                      ]}
                      onPress={() => setSelectedFloor(wh.warehouse_name)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedFloor === wh.warehouse_name &&
                            styles.chipTextActive,
                        ]}
                      >
                        {wh.warehouse_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}

            {selectedFloor && (
              <Animated.View entering={FadeInUp}>
                <ModernInput
                  label="Rack / Shelf Number"
                  placeholder="e.g. A-123"
                  value={rackName}
                  onChangeText={setRackName}
                  autoCapitalize="characters"
                />
              </Animated.View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <ModernButton
              title="Start Session"
              onPress={handleStartSession}
              loading={isCreating}
              disabled={!locationType || !selectedFloor || !rackName.trim()}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[200],
  },
  activeTab: {
    backgroundColor: colors.primary[600],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[600],
  },
  activeTabText: {
    color: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  createButton: {
    marginBottom: spacing.lg,
  },
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  warehouseText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  sessionStats: {
    flexDirection: "row",
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  modalContent: {
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  chipTextActive: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.medium,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingBottom: Platform.OS === "ios" ? spacing["2xl"] : spacing.lg,
  },
});
