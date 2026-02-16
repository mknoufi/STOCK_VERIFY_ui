/**
 * Session Detail Screen - Refactored with Shared Components
 * Uses unified ItemDetailCard for count line items
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../../src/components/ui";
import {
  ItemStatsRow,
  createSessionStats,
  type ActionButton,
} from "../../../src/components/items";
import {
  getSession,
  getCountLines,
  approveCountLine,
  rejectCountLine,
  updateSessionStatus,
  verifyStock,
  unverifyStock,
} from "../../../src/services/api/api";
import { useToast } from "../../../src/components/feedback/ToastProvider";
import { theme } from "../../../src/styles/modernDesignSystem";

export default function SessionDetailV2() {
  const { id, sessionId } = useLocalSearchParams();
  const targetSessionId = (id || sessionId) as string;

  const { show } = useToast();
  const [session, setSession] = React.useState<any>(null);
  const [toVerifyLines, setToVerifyLines] = React.useState<any[]>([]);
  const [verifiedLines, setVerifiedLines] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"toVerify" | "verified">("toVerify");
  const [verifying, setVerifying] = React.useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = React.useState(false);

  // ========================================================================
  // Data Loading
  // ========================================================================
  const loadData = React.useCallback(async () => {
    if (!targetSessionId) return;
    try {
      setLoading(true);
      const [sessionData, toVerifyData, verifiedData] = await Promise.all([
        getSession(targetSessionId),
        getCountLines(targetSessionId, 1, 100, false),
        getCountLines(targetSessionId, 1, 100, true),
      ]);
      setSession(sessionData);
      setToVerifyLines(toVerifyData?.items || []);
      setVerifiedLines(verifiedData?.items || []);
    } catch {
      show("Failed to load session data", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  }, [targetSessionId, show]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================================================
  // Line Actions
  // ========================================================================
  const handleApproveLine = async (lineId: string) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await approveCountLine(lineId);
      await loadData();
      show("Count line approved", "success");
    } catch {
      show("Failed to approve", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleRejectLine = async (lineId: string) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await rejectCountLine(lineId);
      await loadData();
      show("Count line rejected", "success");
    } catch {
      show("Failed to reject", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleVerifyStock = async (lineId: string) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      setVerifying(lineId);
      await verifyStock(lineId);
      await loadData();
      show("Stock verified", "success");
    } catch {
      show("Failed to verify stock", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setVerifying(null);
    }
  };

  const handleUnverifyStock = async (lineId: string) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setVerifying(lineId);
      await unverifyStock(lineId);
      await loadData();
      show("Verification removed", "success");
    } catch {
      show("Failed to remove verification", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setVerifying(null);
    }
  };

  // ========================================================================
  // Session Actions
  // ========================================================================
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setProcessingStatus(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await updateSessionStatus(targetSessionId, newStatus);
      await loadData();
      show(`Session status updated to ${newStatus}`, "success");
    } catch {
      show("Failed to update status", "error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setProcessingStatus(false);
    }
  };

  const switchTab = (tab: "toVerify" | "verified") => {
    if (activeTab === tab) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setActiveTab(tab);
  };

  // ========================================================================
  // Render
  // ========================================================================
  if (loading || !session) {
    return (
      <ScreenContainer
        header={{ title: "Session Details", showBackButton: true }}
        backgroundType="aurora"
        loading={true}
        loadingText="Loading Session..."
      />
    );
  }

  const currentLines = activeTab === "toVerify" ? toVerifyLines : verifiedLines;
  const totalLines = toVerifyLines.length + verifiedLines.length;

  // Session action buttons based on status
  const getSessionActions = (): ActionButton[] => {
    if (session.status === "OPEN") {
      return [
        {
          type: "custom",
          label: "Move to Reconcile",
          icon: "swap-horizontal",
          variant: "warning",
          onPress: () => handleUpdateStatus("RECONCILE"),
          loading: processingStatus,
        },
      ];
    }
    if (session.status === "RECONCILE") {
      return [
        {
          type: "custom",
          label: "Close Session",
          icon: "checkmark-done",
          variant: "success",
          onPress: () => handleUpdateStatus("CLOSED"),
          loading: processingStatus,
        },
      ];
    }
    return [];
  };

  const sessionActions = getSessionActions();

  // List Header Component
  const ListHeader = () => (
    <View>
      {/* Session Info Card */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <GlassCard
          intensity={15}
          padding={theme.spacing.md}
          borderRadius={theme.borderRadius.lg}
          style={styles.sessionInfoCard}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Warehouse</Text>
            <Text style={styles.infoValue}>{session.warehouse}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Staff</Text>
            <Text style={styles.infoValue}>{session.staff_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, styles.statusValue]}>
              {session.status}
            </Text>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Stats Row */}
      <ItemStatsRow
        stats={createSessionStats(
          totalLines,
          verifiedLines.length,
          toVerifyLines.length,
          session.total_variance || 0
        )}
        animationDelay={200}
      />

      {/* Session Actions */}
      {sessionActions.length > 0 && (
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.actionContainer}
        >
          {sessionActions.map((action, index) => (
            <AnimatedPressable
              key={index}
              style={[
                styles.sessionActionButton,
                action.variant === "warning" && styles.warningButton,
                action.variant === "success" && styles.successButton,
              ]}
              onPress={action.onPress}
              disabled={action.loading}
            >
              {action.loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={action.icon || "ellipse"} size={20} color="#fff" />
                  <Text style={styles.sessionActionText}>{action.label}</Text>
                </>
              )}
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}

      {/* Tab Selection */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === "toVerify" && styles.tabActive]}
          onPress={() => switchTab("toVerify")}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === "toVerify" ? "#fff" : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === "toVerify" && styles.tabTextActive]}>
            To Verify ({toVerifyLines.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "verified" && styles.tabActive]}
          onPress={() => switchTab("verified")}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={activeTab === "verified" ? "#fff" : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === "verified" && styles.tabTextActive]}>
            Verified ({verifiedLines.length})
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // Render count line item
  const renderItem = ({ item, index: _index }: { item: any; index: number }) => {
    const varianceColor = item.variance === 0
      ? theme.colors.success.main
      : theme.colors.error.main;
    const isProcessing = verifying === item.id;

    return (
      <GlassCard
        intensity={15}
        padding={theme.spacing.md}
        borderRadius={theme.borderRadius.lg}
        style={styles.lineCard}
      >
        {/* Item Header using shared component styles */}
        <View style={styles.lineHeader}>
          <Text style={styles.lineName} numberOfLines={1}>
            {item.item_name}
          </Text>
          <View style={styles.badgeContainer}>
            {item.verified && (
              <View style={[styles.badge, styles.verifiedBadge]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.success.main} />
                <Text style={[styles.badgeText, { color: theme.colors.success.main }]}>
                  Verified
                </Text>
              </View>
            )}
            <View style={[
              styles.badge,
              { backgroundColor: (item.status === "approved" ? theme.colors.success.main : theme.colors.warning.main) + "30" }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: item.status === "approved" ? theme.colors.success.main : theme.colors.warning.main }
              ]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.lineCode}>Code: {item.item_code}</Text>

        {/* Quantity Row */}
        <View style={styles.qtyRow}>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>ERP</Text>
            <Text style={styles.qtyValue}>{item.erp_qty}</Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>Counted</Text>
            <Text style={styles.qtyValue}>{item.counted_qty}</Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>Variance</Text>
            <Text style={[styles.qtyValue, { color: varianceColor }]}>
              {item.variance > 0 ? "+" : ""}{item.variance}
            </Text>
          </View>
        </View>

        {/* Variance Reason */}
        {item.variance_reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason: {item.variance_reason}</Text>
            {item.variance_note && (
              <Text style={styles.reasonNote}>{item.variance_note}</Text>
            )}
          </View>
        )}

        {/* Remark */}
        {item.remark && (
          <Text style={styles.remark}>Remark: {item.remark}</Text>
        )}

        {/* Verification Info */}
        {item.verified && item.verified_by && (
          <View style={styles.verifiedInfo}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success.main} />
            <Text style={styles.verifiedInfoText}>
              Verified by {item.verified_by} on {new Date(item.verified_at).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Line Actions */}
        <View style={styles.lineActions}>
          {item.status === "pending" && (
            <>
              <AnimatedPressable
                style={styles.approveButton}
                onPress={() => handleApproveLine(item.id)}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.rejectButton}
                onPress={() => handleRejectLine(item.id)}
              >
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </AnimatedPressable>
            </>
          )}

          {activeTab === "toVerify" && !item.verified && (
            <AnimatedPressable
              style={[styles.verifyButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleVerifyStock(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Verify Stock</Text>
                </>
              )}
            </AnimatedPressable>
          )}

          {activeTab === "verified" && item.verified && (
            <AnimatedPressable
              style={[styles.unverifyButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleUnverifyStock(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Unverify</Text>
                </>
              )}
            </AnimatedPressable>
          )}
        </View>
      </GlassCard>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "toVerify" ? "list-outline" : "checkmark-circle"}
        size={64}
        color={theme.colors.text.tertiary}
      />
      <Text style={styles.emptyText}>
        {activeTab === "toVerify" ? "No items to verify" : "No verified items"}
      </Text>
    </View>
  );

  return (
    <ScreenContainer
      header={{
        title: "Session Details",
        showBackButton: true,
        showLogoutButton: true,
      }}
      backgroundType="aurora"
      auroraVariant="primary"
      auroraIntensity="medium"
      contentMode="static"
      noPadding
      statusBarStyle="light"
    >
      <StatusBar style="light" />
      
      <View style={styles.container}>
        <FlashList
          data={currentLines}
          renderItem={renderItem}
          // estimatedItemSize={280} // Removed unsupported prop
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
        />
      </View>
    </ScreenContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: theme.spacing.md,
  },
  sessionInfoCard: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  statusValue: {
    color: theme.colors.warning.main,
  },
  actionContainer: {
    marginBottom: theme.spacing.md,
  },
  sessionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  warningButton: {
    backgroundColor: theme.colors.warning.main,
  },
  successButton: {
    backgroundColor: theme.colors.success.main,
  },
  sessionActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  lineCard: {
    marginBottom: theme.spacing.sm,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  lineName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    color: theme.colors.text.primary,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.success.main + "20",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  lineCode: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  qtyItem: {
    flex: 1,
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  reasonBox: {
    backgroundColor: theme.colors.warning.main + "15",
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning.main,
  },
  reasonLabel: {
    fontSize: 13,
    color: theme.colors.warning.main,
    fontWeight: "600",
    marginBottom: 2,
  },
  reasonNote: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  remark: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontStyle: "italic",
    marginBottom: theme.spacing.xs,
  },
  verifiedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.success.main + "15",
    borderRadius: theme.borderRadius.sm,
    gap: 8,
  },
  verifiedInfoText: {
    fontSize: 12,
    color: theme.colors.success.main,
  },
  lineActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    flexWrap: "wrap",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.success.main,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 100,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.error.main,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 100,
  },
  verifyButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 120,
  },
  unverifyButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.warning.main,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 120,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 64,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    marginTop: theme.spacing.md,
  },
});
