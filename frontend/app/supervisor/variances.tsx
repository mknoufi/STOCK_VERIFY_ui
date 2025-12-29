/**
 * Variance List Screen
 * Displays all items with variances (verified qty != system qty)
 * Refactored to use Aurora Design System
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  ItemVerificationAPI,
  VarianceItem,
} from "../../src/domains/inventory/services/itemVerificationApi";
import { ItemFilters, FilterValues } from "../../src/domains/inventory/components/ItemFilters";
import { exportVariancesToCSV, downloadCSV } from "../../src/utils/csvExport";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";

const getLocalFileUri = (filename: string) => {
  const baseDir =
    FileSystem.Paths?.document?.uri ?? FileSystem.Paths?.cache?.uri ?? "";
  return `${baseDir}${filename}`;
};

export default function VariancesScreen() {
  const router = useRouter();
  const [variances, setVariances] = useState<VarianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    skip: 0,
  });

  const loadVariances = React.useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          setPagination((prev) => ({ ...prev, skip: 0 }));
        }

        const skip = reset ? 0 : pagination.skip;
        const response = await ItemVerificationAPI.getVariances({
          category: filters.category,
          floor: filters.floor,
          rack: filters.rack,
          warehouse: filters.warehouse,
          limit: pagination.limit,
          skip,
        });

        if (reset) {
          setVariances(response.variances);
        } else {
          setVariances((prev) => [...prev, ...response.variances]);
        }

        setPagination(response.pagination);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load variances");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, pagination.limit, pagination.skip],
  );

  useEffect(() => {
    loadVariances(true);
  }, [loadVariances]);

  const handleRefresh = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadVariances(true);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.skip + pagination.limit < pagination.total) {
      setPagination((prev) => ({
        ...prev,
        skip: prev.skip + prev.limit,
      }));
      loadVariances(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      if (variances.length === 0) {
        Alert.alert("No Data", "There are no variances to export");
        return;
      }

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let allVariances = variances;
      if (pagination.total > variances.length) {
        // Fetch all variances with current filters
        const response = await ItemVerificationAPI.getVariances({
          category: filters.category,
          floor: filters.floor,
          rack: filters.rack,
          warehouse: filters.warehouse,
          limit: pagination.total,
          skip: 0,
        });
        allVariances = response.variances;
      }

      const csvContent = exportVariancesToCSV(allVariances);
      const filename = `variances_${new Date().toISOString().split("T")[0]}.csv`;

      if (Platform.OS === "web") {
        downloadCSV(csvContent, filename);
        Alert.alert("Success", "CSV file downloaded");
      } else {
        const fileUri = getLocalFileUri(filename);
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: "utf8",
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", `File saved to: ${fileUri}`);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to export CSV");
    }
  };

  const renderVarianceItem = ({ item }: { item: VarianceItem }) => {
    // Determine status color based on variance
    const isPositive = item.variance > 0;
    const statusColor = isPositive ? theme.colors.success.main : theme.colors.error.main;

    const varianceSign = isPositive ? "+" : "";

    return (
      <AnimatedPressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          router.push({
            pathname: "/supervisor/variance-details",
            params: {
              itemCode: item.item_code,
              sessionId: item.session_id || "current",
            },
          });
        }}
        style={{ marginBottom: theme.spacing.md }}
      >
        <GlassCard
          intensity={15}
          padding={theme.spacing.md}
          borderRadius={theme.borderRadius.lg}
          style={{
            borderColor: `${statusColor}40`, // Low opacity border matching status
            borderWidth: 1,
          }}
        >
          <View style={styles.varianceHeader}>
            <View style={styles.varianceHeaderLeft}>
              <Text style={styles.itemName}>{item.item_name}</Text>
              <Text style={styles.itemCode}>{item.item_code}</Text>
            </View>
            <View
              style={[
                styles.varianceBadge,
                { backgroundColor: `${statusColor}20` }, // Low opacity background
              ]}
            >
              <Text style={[styles.varianceBadgeText, { color: statusColor }]}>
                {varianceSign}
                {(item.variance ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.varianceDetails}>
            <View style={styles.qtyRow}>
              <View style={styles.qtyItem}>
                <Text style={styles.qtyLabel}>System Qty</Text>
                <Text style={styles.qtyValue}>
                  {(item.system_qty ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.qtyItem}>
                <Text style={styles.qtyLabel}>Verified Qty</Text>
                <Text
                  style={[
                    styles.qtyValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {(item.verified_qty ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {(item.floor || item.rack) && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.locationText}>
                  {[item.floor, item.rack].filter(Boolean).join(" / ")}
                </Text>
              </View>
            )}

            {item.category && (
              <Text style={styles.categoryText}>
                {item.category}
                {item.subcategory && ` • ${item.subcategory}`}
              </Text>
            )}

            <View style={styles.verificationInfo}>
              <Ionicons
                name="person-outline"
                size={12}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.verificationInfoText}>
                Verified by {item.verified_by}
                {item.verified_at &&
                  ` • ${new Date(item.verified_at).toLocaleDateString()}`}
              </Text>
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    );
  };

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
            <View>
              <Text style={styles.pageTitle}>Variances</Text>
              <Text style={styles.pageSubtitle}>
                {pagination.total} discrepancies found
              </Text>
            </View>
          </View>

          <AnimatedPressable
            style={[
              styles.exportButton,
              variances.length === 0 && { opacity: 0.5 },
            ]}
            onPress={handleExportCSV}
            disabled={variances.length === 0}
          >
            <GlassCard
              intensity={20}
              padding={8}
              borderRadius={theme.borderRadius.full}
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={theme.colors.text.primary}
              />
            </GlassCard>
          </AnimatedPressable>
        </Animated.View>

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassCard
            intensity={10}
            padding={theme.spacing.sm}
            style={{ marginBottom: theme.spacing.md }}
          >
            <ItemFilters
              onFilterChange={setFilters}
              showVerifiedFilter={false} // Verified filter irrelevant here as all are filtered by variance
              showSearch={false}
            />
          </GlassCard>
        </Animated.View>

        {variances.length === 0 && !loading ? (
          <View style={styles.centered}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={64}
              color={theme.colors.success.main}
            />
            <Text style={styles.emptyText}>No variances found</Text>
            <Text style={styles.emptySubtext}>
              All items match system quantities
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={variances}
              renderItem={renderVarianceItem}
              // @ts-ignore
              estimatedItemSize={180}
              keyExtractor={(item, index) =>
                `${item.item_code}-${item.verified_at}-${index}`
              }
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary[500]}
                  colors={[theme.colors.primary[500]]}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading && variances.length > 0 ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary[500]}
                    />
                  </View>
                ) : (
                  <View style={{ height: 20 }} />
                )
              }
            />
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: theme.spacing.md,
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
  pageTitle: {
    fontSize: 32,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  exportButton: {
    //
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  varianceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  varianceHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  varianceBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  varianceBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  varianceDetails: {
    //
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  qtyItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  qtyLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.secondary, // Subtle for System, Primary/Highlight for Verified
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontStyle: "italic",
    marginBottom: theme.spacing.xs,
    marginTop: 2,
  },
  verificationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  verificationInfoText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "500",
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
});
