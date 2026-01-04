import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ItemVerificationAPI } from "../../src/domains/inventory/services/itemVerificationApi";
import {
  ScreenContainer,
  GlassCard,
  StatsCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";
import { useToast } from "../../src/components/feedback/ToastProvider";

export default function VarianceDetailsScreen() {
  const { itemCode } = useLocalSearchParams();
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

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
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        show("Item details not found", "error");
        router.back();
      }
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(error.message || "Failed to load details", "error");
    } finally {
      setLoading(false);
    }
  }, [itemCode, router, show]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleApprove = async () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
                await ItemVerificationAPI.approveVariance(
                  itemDetails.count_line_id,
                );
                if (Platform.OS !== "web")
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                show("Variance approved successfully", "success");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              if (Platform.OS !== "web")
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
              show(error.message || "Failed to approve variance", "error");
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleRecount = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
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
                await ItemVerificationAPI.requestRecount(
                  itemDetails.count_line_id,
                );
                if (Platform.OS !== "web")
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                show("Recount requested successfully", "success");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              if (Platform.OS !== "web")
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
              show(error.message || "Failed to request recount", "error");
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </ScreenContainer>
    );
  }

  if (!itemDetails) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <GlassCard intensity={15} padding={theme.spacing.xl}>
            <View style={{ alignItems: "center", gap: theme.spacing.md }}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={theme.colors.text.tertiary}
              />
              <Text style={{ color: theme.colors.text.secondary }}>
                Item not found
              </Text>
              <AnimatedPressable onPress={() => router.back()}>
                <Text style={{ color: theme.colors.primary[500] }}>
                  Go Back
                </Text>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.text.primary}
              />
            </AnimatedPressable>
            <Text style={styles.headerTitle}>Variance Details</Text>
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Item Profile */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <GlassCard
              intensity={15}
              padding={theme.spacing.lg}
              borderRadius={theme.borderRadius.lg}
              style={styles.card}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={32}
                    color={theme.colors.primary[500]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{itemDetails.item_name}</Text>
                  <Text style={styles.itemCode}>{itemDetails.item_code}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Stats Row */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.statsRow}
          >
            <StatsCard
              title="System Qty"
              value={itemDetails.system_qty?.toString() || "0"}
              icon="server-outline"
              variant="primary"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Verified Qty"
              value={itemDetails.verified_qty?.toString() || "0"}
              icon="checkmark-circle-outline"
              variant="success"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Variance"
              value={`${itemDetails.variance > 0 ? "+" : ""}${itemDetails.variance}`}
              icon="swap-vertical-outline"
              variant={itemDetails.variance === 0 ? "success" : "error"}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* Details */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <GlassCard
              intensity={15}
              padding={theme.spacing.lg}
              borderRadius={theme.borderRadius.lg}
              style={styles.card}
            >
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
                <View
                  style={[styles.detailRow, { marginTop: theme.spacing.md }]}
                >
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
            </GlassCard>
          </Animated.View>
        </ScrollView>

        {/* Footer Actions */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.footer}
        >
          <GlassCard
            intensity={15}
            padding={theme.spacing.md}
            style={styles.footerInner}
          >
            <View style={styles.actionsContainer}>
              <AnimatedPressable
                onPress={handleRecount}
                disabled={processing}
                style={[styles.actionButton, styles.secondaryButton]}
              >
                <Text style={styles.secondaryButtonText}>Request Recount</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleApprove}
                disabled={processing}
                style={[styles.actionButton, styles.primaryButton]}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Approve Variance</Text>
                )}
              </AnimatedPressable>
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 24,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100, // Space for footer
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.4)",
  },
  itemName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
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
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
  },
  footerInner: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: theme.colors.error.main,
    shadowColor: theme.colors.error.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
