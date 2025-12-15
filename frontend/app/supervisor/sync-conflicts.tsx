/**
 * Sync Conflicts Screen
 * Review and resolve data synchronization conflicts
 * Refactored to use Aurora Design System
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// import { usePermissions } from "../../src/hooks/usePermissions";
import {
  getSyncConflicts,
  resolveSyncConflict,
  batchResolveSyncConflicts,
  getSyncConflictStats,
} from "../../src/services/api/api";
import { AuroraBackground, GlassCard, StatsCard, AnimatedPressable } from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface SyncConflict {
  _id: string;
  session_id: string;
  item_code: string;
  conflict_type: string;
  local_value: any;
  server_value: any;
  status: string;
  detected_at: string;
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export default function SyncConflictsScreen() {
  const router = useRouter();
  // const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  /* const { hasPermission } = usePermissions(); */
  const [refreshing, setRefreshing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(
    new Set(),
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(
    null,
  );
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    // Security: Check permission before allowing conflict resolution
    if (!hasPermission("sync.resolve_conflict")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to resolve sync conflicts.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadConflicts(), loadStats()]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadConflicts = async () => {
    try {
      const status = filterStatus === "all" ? undefined : filterStatus;
      const response = await getSyncConflicts(status);
      setConflicts(response.data?.conflicts || []);
    } catch (error: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to load sync conflicts");
    }
  };

  const loadStats = async () => {
    try {
      const response = await getSyncConflictStats();
      setStats(response.data);
    } catch (error: any) {
      console.error("Failed to load conflict stats:", error);
    }
  };

  const handleRefresh = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
  };

  const handleResolve = async (conflictId: string, resolution: string) => {
    try {
      await resolveSyncConflict(conflictId, resolution, resolutionNote);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Conflict resolved successfully");
      setModalVisible(false);
      setSelectedConflict(null);
      setResolutionNote("");
      loadData();
    } catch (error: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to resolve conflict");
    }
  };

  const handleBatchResolve = async (resolution: string) => {
    if (selectedConflicts.size === 0) {
      Alert.alert("Error", "Please select conflicts to resolve");
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      "Confirm Batch Resolution",
      `Resolve ${selectedConflicts.size} conflicts with "${resolution}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          onPress: async () => {
            try {
              await batchResolveSyncConflicts(
                Array.from(selectedConflicts),
                resolution,
                resolutionNote,
              );
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Conflicts resolved successfully");
              setSelectedConflicts(new Set());
              setResolutionNote("");
              loadData();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to resolve conflicts",
              );
            }
          },
        },
      ],
    );
  };

  const toggleConflictSelection = (conflictId: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const newSelection = new Set(selectedConflicts);
    if (newSelection.has(conflictId)) {
      newSelection.delete(conflictId);
    } else {
      newSelection.add(conflictId);
    }
    setSelectedConflicts(newSelection);
  };

  const openConflictDetail = (conflict: SyncConflict) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedConflict(conflict);
    setModalVisible(true);
  };

  const renderConflictCard = ({ item }: { item: SyncConflict }) => {
    const isSelected = selectedConflicts.has(item._id);

    return (
      <AnimatedPressable
        onPress={() => toggleConflictSelection(item._id)}
        onLongPress={() => openConflictDetail(item)}
        style={{ marginBottom: auroraTheme.spacing.md }}
      >
        <GlassCard
          variant={isSelected ? "medium" : "light"}
          padding={auroraTheme.spacing.md}
          borderRadius={auroraTheme.borderRadius.lg}
          style={isSelected ? { borderColor: auroraTheme.colors.primary[500], borderWidth: 1 } : undefined}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemCode}>{item.item_code}</Text>
              <View style={styles.conflictTypeContainer}>
                <Text style={styles.conflictType}>{item.conflict_type}</Text>
              </View>
            </View>
          </View>

          <View style={styles.conflictData}>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Local Value</Text>
              <GlassCard variant="dark" intensity={10} padding={8} borderRadius={auroraTheme.borderRadius.sm}>
                <Text style={styles.dataValue} numberOfLines={2}>
                  {JSON.stringify(item.local_value)}
                </Text>
              </GlassCard>
            </View>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Server Value</Text>
              <GlassCard variant="dark" intensity={10} padding={8} borderRadius={auroraTheme.borderRadius.sm}>
                <Text style={styles.dataValue} numberOfLines={2}>
                  {JSON.stringify(item.server_value)}
                </Text>
              </GlassCard>
            </View>
          </View>

          <Text style={styles.timestamp}>
            Detected: {new Date(item.detected_at).toLocaleString()}
          </Text>

          {item.status !== "pending" && (
            <View style={styles.resolvedInfo}>
              <Ionicons name="checkmark-circle-outline" size={14} color={auroraTheme.colors.success[500]} />
              <Text style={styles.resolvedText}>
                Resolved: {item.resolution} by {item.resolved_by}
              </Text>
            </View>
          )}
        </GlassCard>
      </AnimatedPressable>
    );
  };

  return (
    <AuroraBackground variant="secondary" intensity="medium" animated>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={auroraTheme.colors.text.primary} />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Sync Conflicts</Text>
              <Text style={styles.pageSubtitle}>Resolve data discrepancies</Text>
            </View>
          </View>
        </Animated.View>

        {stats && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsContainer}>
            <StatsCard
              title="Total"
              value={stats.total?.toString() || "0"}
              icon="alert-circle-outline"
              variant="primary"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Pending"
              value={stats.pending?.toString() || "0"}
              icon="time-outline"
              variant="warning"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Resolved"
              value={stats.resolved?.toString() || "0"}
              icon="checkmark-circle-outline"
              variant="success"
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.filterBar}>
          {["pending", "resolved", "all"].map((status) => (
            <AnimatedPressable
              key={status}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setFilterStatus(status);
              }}
              style={{ flex: 1 }}
            >
              <GlassCard
                variant={filterStatus === status ? "medium" : "light"}
                padding={auroraTheme.spacing.sm}
                borderRadius={auroraTheme.borderRadius.full}
                style={[
                  styles.filterButton,
                  filterStatus === status && { borderColor: auroraTheme.colors.primary[500], borderWidth: 1 }
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && { color: auroraTheme.colors.primary[500] },
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </GlassCard>
            </AnimatedPressable>
          ))}
        </Animated.View>

        {selectedConflicts.size > 0 && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.batchActions}>
            <GlassCard variant="medium" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.lg} style={styles.batchCard}>
              <Text style={styles.batchText}>
                {selectedConflicts.size} selected
              </Text>
              <View style={styles.batchButtons}>
                <AnimatedPressable
                  style={[styles.batchButton, { backgroundColor: auroraTheme.colors.success[500] }]}
                  onPress={() => handleBatchResolve("accept_server")}
                >
                  <Text style={styles.batchButtonText}>Accept Server</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.batchButton, { backgroundColor: auroraTheme.colors.secondary[500] }]}
                  onPress={() => handleBatchResolve("accept_local")}
                >
                  <Text style={styles.batchButtonText}>Accept Local</Text>
                </AnimatedPressable>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={auroraTheme.colors.primary[500]} />
            <Text style={styles.loadingText}>Loading conflicts...</Text>
          </View>
        ) : conflicts.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={64}
              color={auroraTheme.colors.success[500]}
            />
            <Text style={styles.emptyText}>No conflicts found</Text>
            <Text style={styles.emptySubtext}>System data is in sync</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={conflicts}
              renderItem={renderConflictCard}
              // @ts-ignore
              estimatedItemSize={200}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={auroraTheme.colors.primary[500]}
                  colors={[auroraTheme.colors.primary[500]]}
                />
              }
            />
          </View>
        )}

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <AuroraBackground variant="primary" intensity="high" style={styles.modalOverlay}>
            <GlassCard variant="modal" padding={auroraTheme.spacing.lg} borderRadius={auroraTheme.borderRadius.xl} style={styles.modalContent}>
              <Text style={styles.modalTitle}>Resolve Conflict</Text>

              {selectedConflict && (
                <>
                  <Text style={styles.modalLabel}>
                    Item: <Text style={{ color: "white" }}>{selectedConflict.item_code}</Text>
                  </Text>
                  <View style={styles.modalTypeBadge}>
                    <Text style={styles.modalTypeText}>{selectedConflict.conflict_type}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Local Value</Text>
                    <GlassCard variant="dark" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.md}>
                      <Text style={styles.modalValue}>
                        {JSON.stringify(selectedConflict.local_value, null, 2)}
                      </Text>
                    </GlassCard>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Server Value</Text>
                    <GlassCard variant="dark" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.md}>
                      <Text style={styles.modalValue}>
                        {JSON.stringify(selectedConflict.server_value, null, 2)}
                      </Text>
                    </GlassCard>
                  </View>

                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Resolution note (optional)"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                    value={resolutionNote}
                    onChangeText={setResolutionNote}
                    multiline
                  />

                  <View style={styles.modalActions}>
                    <AnimatedPressable
                      style={[styles.modalButton, { backgroundColor: auroraTheme.colors.success[500] }]}
                      onPress={() => handleResolve(selectedConflict._id, "accept_server")}
                    >
                      <Text style={styles.modalButtonText}>Accept Server</Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      style={[styles.modalButton, { backgroundColor: auroraTheme.colors.secondary[500] }]}
                      onPress={() => handleResolve(selectedConflict._id, "accept_local")}
                    >
                      <Text style={styles.modalButtonText}>Accept Local</Text>
                    </AnimatedPressable>
                  </View>

                  <AnimatedPressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </AnimatedPressable>
                </>
              )}
            </GlassCard>
          </AuroraBackground>
        </Modal>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: auroraTheme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: auroraTheme.spacing.md,
  },
  backButton: {
    padding: auroraTheme.spacing.xs,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  pageTitle: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize["2xl"],
    color: auroraTheme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  statsContainer: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
    marginBottom: auroraTheme.spacing.md,
  },
  filterBar: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
    marginBottom: auroraTheme.spacing.md,
  },
  filterButton: {
    alignItems: "center",
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary,
  },
  batchActions: {
    marginBottom: auroraTheme.spacing.md,
  },
  batchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: '600',
    color: auroraTheme.colors.text.primary,
  },
  batchButtons: {
    flexDirection: 'row',
    gap: auroraTheme.spacing.sm,
  },
  batchButton: {
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: 8,
    borderRadius: auroraTheme.borderRadius.full,
  },
  batchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: auroraTheme.typography.fontSize.xs,
  },
  listContent: {
    paddingBottom: auroraTheme.spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: auroraTheme.borderRadius.sm,
    borderWidth: 2,
    borderColor: auroraTheme.colors.text.tertiary,
    marginRight: auroraTheme.spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: auroraTheme.colors.primary[500],
    borderColor: auroraTheme.colors.primary[500],
  },
  itemCode: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
  },
  conflictTypeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.full,
    marginTop: 4,
  },
  conflictType: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.warning[500],
    fontWeight: '600',
  },
  conflictData: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.md,
  },
  dataColumn: {
    flex: 1,
  },
  dataLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dataValue: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timestamp: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  resolvedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: auroraTheme.spacing.xs,
    marginTop: auroraTheme.spacing.sm,
    paddingTop: auroraTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.light,
  },
  resolvedText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.success[500],
  },
  loadingText: {
    marginTop: auroraTheme.spacing.md,
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.secondary,
  },
  emptyText: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "500",
    color: auroraTheme.colors.text.secondary,
    marginTop: auroraTheme.spacing.md,
  },
  emptySubtext: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.tertiary,
    marginTop: auroraTheme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: auroraTheme.typography.fontSize["2xl"],
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.secondary,
    marginBottom: 4,
  },
  modalTypeBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: auroraTheme.borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: auroraTheme.spacing.lg,
  },
  modalTypeText: {
    color: auroraTheme.colors.warning[500],
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: auroraTheme.spacing.lg,
  },
  modalSectionTitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "600",
    color: auroraTheme.colors.text.tertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: auroraTheme.colors.text.primary,
    padding: 12,
    borderRadius: auroraTheme.borderRadius.md,
    fontSize: auroraTheme.typography.fontSize.md,
    marginBottom: auroraTheme.spacing.lg,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: auroraTheme.borderRadius.full,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: auroraTheme.colors.background.glass,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: "600",
  },
});
