/**
 * Variance Details Screen - Refactored with Shared Components
 * Uses unified ItemDetailCard, ItemStatsRow, ItemActionsFooter
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import {
  ItemDetailCard,
  ItemStatsRow,
  ItemActionsFooter,
  ItemShareSheet,
  ItemQuickActions,
  createVarianceStats,
  createItemQuickActions,
  type ActionButton,
} from "../../src/components/items";
import { ItemVerificationAPI } from "../../src/domains/inventory/services/itemVerificationApi";
import { useToast } from "../../src/components/feedback/ToastProvider";
import { theme } from "../../src/styles/modernDesignSystem";

export default function VarianceDetailsScreen() {
  const { itemCode } = useLocalSearchParams();
  const router = useRouter();
  const { show } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // ========================================================================
  // Data Loading
  // ========================================================================
  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ItemVerificationAPI.getVariances({
        search: itemCode as string,
        limit: 1,
      });

      if (response.variances && response.variances.length > 0) {
        setItemDetails(response.variances[0]);
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        show("Item details not found", "error");
        router.back();
      }
    } catch (error: any) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      show(error.message || "Failed to load details", "error");
    } finally {
      setLoading(false);
    }
  }, [itemCode, router, show]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // ========================================================================
  // Actions
  // ========================================================================
  const handleApprove = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    Alert.alert(
      "Confirm Approval",
      "Are you sure you want to approve this variance? This will update the system stock.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              if (itemDetails?.count_line_id) {
                await ItemVerificationAPI.approveVariance(itemDetails.count_line_id);
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                show("Variance approved successfully", "success");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              show(error.message || "Failed to approve variance", "error");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRecount = async () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    
    Alert.alert(
      "Request Recount",
      "This will flag the item for recount and remove the current verification status.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Recount",
          onPress: async () => {
            try {
              setProcessing(true);
              if (itemDetails?.count_line_id) {
                await ItemVerificationAPI.requestRecount(itemDetails.count_line_id);
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                show("Recount requested successfully", "success");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              show(error.message || "Failed to request recount", "error");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // ========================================================================
  // Render
  // ========================================================================
  if (loading) {
    return (
      <ScreenContainer
        header={{ title: "Variance Details", showBackButton: true }}
        backgroundType="aurora"
        loading={true}
        loadingText="Loading Details..."
      />
    );
  }

  if (!itemDetails) {
    return (
      <ScreenContainer
        header={{ title: "Variance Details", showBackButton: true }}
        backgroundType="aurora"
      >
        <View style={styles.centered}>
          <GlassCard intensity={15} padding={theme.spacing.xl}>
            <View style={styles.emptyContent}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.emptyText}>Item not found</Text>
              <AnimatedPressable onPress={() => router.back()}>
                <Text style={styles.backLink}>Go Back</Text>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </ScreenContainer>
    );
  }

  const systemQty = itemDetails.system_qty || 0;
  const verifiedQty = itemDetails.verified_qty || 0;
  const variance = itemDetails.variance ?? (verifiedQty - systemQty);

  const actions: ActionButton[] = [
    {
      type: "recount",
      label: "Request Recount",
      variant: "secondary",
      onPress: handleRecount,
      disabled: processing,
    },
    {
      type: "approve",
      label: "Approve Variance",
      variant: "danger",
      onPress: handleApprove,
      disabled: processing,
      loading: processing,
    },
  ];

  return (
    <ScreenContainer
      header={{
        title: "Variance Details",
        showBackButton: true,
        showLogoutButton: true,
      }}
      backgroundType="aurora"
      auroraVariant="primary"
      auroraIntensity="medium"
      contentMode="scroll"
      statusBarStyle="light"
    >
      <StatusBar style="light" />
      
      <View style={styles.container}>
        {/* Item Card */}
        <ItemDetailCard
          item={{
            item_code: itemDetails.item_code,
            item_name: itemDetails.item_name,
            barcode: itemDetails.barcode,
            category: itemDetails.category,
            subcategory: itemDetails.subcategory,
            floor: itemDetails.floor,
            rack: itemDetails.rack,
            verified: itemDetails.verified,
            verified_by: itemDetails.verified_by,
            verified_at: itemDetails.verified_at,
          }}
          variant="full"
          showStock={false}
          showPrices={false}
          showLocation={true}
          showVerificationStatus={true}
          animationDelay={100}
        />

        {/* Variance Stats */}
        <ItemStatsRow
          stats={createVarianceStats(systemQty, verifiedQty, variance)}
          animationDelay={200}
        />

        {/* Verification Details */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <GlassCard
            intensity={15}
            padding={theme.spacing.lg}
            borderRadius={theme.borderRadius.lg}
            style={styles.detailsCard}
          >
            <Text style={styles.cardTitle}>Verification Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Verified By</Text>
                <View style={styles.detailValueRow}>
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                  <Text style={styles.detailValue}>
                    {itemDetails.verified_by || "Unknown"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <View style={styles.detailValueRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                  <Text style={styles.detailValue}>
                    {itemDetails.verified_at
                      ? new Date(itemDetails.verified_at).toLocaleString()
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {(itemDetails.floor || itemDetails.rack) && (
              <View style={[styles.detailRow, { marginTop: theme.spacing.md }]}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <View style={styles.detailValueRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={theme.colors.text.secondary}
                    />
                    <Text style={styles.detailValue}>
                      {itemDetails.floor}
                      {itemDetails.rack ? ` / ${itemDetails.rack}` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {itemDetails.remark && (
              <View style={styles.remarkSection}>
                <Text style={styles.detailLabel}>Remark</Text>
                <Text style={styles.remarkText}>{itemDetails.remark}</Text>
              </View>
            )}

            {itemDetails.condition && itemDetails.condition !== "Good" && (
              <View style={styles.conditionSection}>
                <Text style={styles.detailLabel}>Condition</Text>
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionText}>{itemDetails.condition}</Text>
                </View>
                {itemDetails.damaged_qty > 0 && (
                  <Text style={styles.damageText}>
                    Damaged: {itemDetails.damaged_qty}
                  </Text>
                )}
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Photo Preview (if available) */}
        {itemDetails.photo_url && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <GlassCard
              intensity={15}
              padding={theme.spacing.md}
              borderRadius={theme.borderRadius.lg}
              style={styles.photoCard}
            >
              <Text style={styles.cardTitle}>Photo Evidence</Text>
              <View style={styles.photoPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.photoText}>Photo attached</Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Spacer for footer */}
        <View style={{ height: 120 }} />
      </View>

      {/* Footer Actions */}
      <ItemActionsFooter
        actions={actions}
        processing={processing}
        animationDelay={500}
      />

      {/* Share Sheet */}
      <ItemShareSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        item={{
          name: itemDetails.item_name,
          barcode: itemDetails.barcode || itemDetails.item_code,
          quantity: verifiedQty,
          systemQty: systemQty,
          variance: variance,
          category: itemDetails.category,
          location: `${itemDetails.floor || ""} ${itemDetails.rack || ""}`.trim(),
          verifiedBy: itemDetails.verified_by,
          verifiedAt: itemDetails.verified_at,
        }}
      />

      {/* Quick Actions FAB */}
      <ItemQuickActions
        actions={createItemQuickActions({
          onShare: () => setShowShareSheet(true),
        })}
        position="bottom-right"
      />
    </ScreenContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  backLink: {
    color: theme.colors.primary[500],
    fontSize: 16,
    fontWeight: "600",
  },
  detailsCard: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  remarkSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.sm,
  },
  remarkText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  conditionSection: {
    marginTop: theme.spacing.md,
  },
  conditionBadge: {
    backgroundColor: theme.colors.warning.main + "20",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.warning.main,
  },
  damageText: {
    fontSize: 13,
    color: theme.colors.error.main,
    marginTop: 4,
  },
  photoCard: {
    marginBottom: theme.spacing.md,
  },
  photoPlaceholder: {
    height: 120,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  photoText: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
  },
});
