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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/layout/Header";
import { useTheme } from "../../src/hooks/useTheme";
import { verifyStock, unverifyStock } from "../../src/services/api/api";
import { ItemVerificationAPI } from "../../src/services/api/itemVerificationApi";
import { useToast } from "../../src/components/feedback/ToastProvider";
import {
  spacing,
  typography,
  borderRadius,
  colors,
} from "../../src/styles/globalStyles";
import { Button } from "../../src/components/Button";

export default function VarianceDetailsScreen() {
  const { itemCode } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const loadDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      // We might need a specific endpoint for details, but for now we can use getVariances with filters
      // or a new endpoint if available. Assuming we can filter by itemCode.
      // Since getVariances returns a list, we'll filter client side or add a param if needed.
      // For now, let's assume we can get it via a new method or existing one.
      // Actually, let's use a direct API call if possible, or just fetch variances and find it.

      // Better approach: Add getVarianceDetails to ItemVerificationAPI
      const response = await ItemVerificationAPI.getVariances({
        search: itemCode as string,
        limit: 1,
      });

      if (response.variances && response.variances.length > 0) {
        setItemDetails(response.variances[0]);
      } else {
        Alert.alert("Error", "Item details not found");
        router.back();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [itemCode, router]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleApprove = async () => {
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
                Alert.alert("Success", "Variance approved successfully");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to approve variance",
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleRecount = async () => {
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
                Alert.alert("Success", "Recount requested successfully");
                router.back();
              } else {
                throw new Error("Count line ID not found");
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to request recount",
              );
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
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!itemDetails) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={{ color: theme.colors.text }}>Item not found</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Variance Details
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.itemName, { color: theme.colors.text }]}>
            {itemDetails.item_name}
          </Text>
          <Text
            style={[styles.itemCode, { color: theme.colors.textSecondary }]}
          >
            {itemDetails.item_code}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                System Qty
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {itemDetails.system_qty}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Verified Qty
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {itemDetails.verified_qty}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Variance
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      itemDetails.variance !== 0
                        ? colors.error
                        : colors.success,
                  },
                ]}
              >
                {itemDetails.variance > 0 ? "+" : ""}
                {itemDetails.variance}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Verification Details
          </Text>
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Verified By:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {itemDetails.verified_by}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Time:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {new Date(itemDetails.verified_at).toLocaleString()}
            </Text>
          </View>
          {itemDetails.floor && (
            <View style={styles.detailRow}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Location:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {itemDetails.floor}{" "}
                {itemDetails.rack ? `/ ${itemDetails.rack}` : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Button
            title="Request Recount"
            onPress={handleRecount}
            variant="outline"
            style={styles.actionButton}
            disabled={processing}
          />
          <Button
            title="Approve Variance"
            onPress={handleApprove}
            style={styles.actionButton}
            disabled={processing}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.h4,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  itemCode: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: spacing.md,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  statValue: {
    ...typography.h4,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
  },
  detailValue: {
    ...typography.body,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});
