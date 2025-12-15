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
} from "../../src/services/api/itemVerificationApi";
import { ItemFilters, FilterValues } from "../../src/components/ItemFilters";
import { exportVariancesToCSV, downloadCSV } from "../../src/utils/csvExport";
import { AuroraBackground, GlassCard, AnimatedPressable } from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
    const statusColor = isPositive
      ? auroraTheme.colors.success[500]
      : auroraTheme.colors.error[500];

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
        style={{ marginBottom: auroraTheme.spacing.md }}
      >
        <GlassCard
          variant="light"
          padding={auroraTheme.spacing.md}
          borderRadius={auroraTheme.borderRadius.lg}
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
                {varianceSign}{item.variance.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.varianceDetails}>
            <View style={styles.qtyRow}>
              <View style={styles.qtyItem}>
                <Text style={styles.qtyLabel}>System Qty</Text>
                <Text style={styles.qtyValue}>{item.system_qty.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.qtyItem}>
                <Text style={styles.qtyLabel}>Verified Qty</Text>
                <Text style={[styles.qtyValue, { color: auroraTheme.colors.text.primary }]}>
                  {item.verified_qty.toFixed(2)}
                </Text>
              </View>
            </View>

            {(item.floor || item.rack) && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={auroraTheme.colors.text.tertiary}
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
                color={auroraTheme.colors.text.tertiary}
              />
              <Text style={styles.verificationInfoText}>
                Verified by {item.verified_by}
                {item.verified_at && ` • ${new Date(item.verified_at).toLocaleDateString()}`}
              </Text>
            </View>
          </View>
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
              <Text style={styles.pageTitle}>Variances</Text>
              <Text style={styles.pageSubtitle}>{pagination.total} discrepancies found</Text>
            </View>
          </View>

          <AnimatedPressable
            style={[
              styles.exportButton,
              variances.length === 0 && { opacity: 0.5 }
            ]}
            onPress={handleExportCSV}
            disabled={variances.length === 0}
          >
            <GlassCard variant="medium" padding={8} borderRadius={auroraTheme.borderRadius.full}>
              <Ionicons name="download-outline" size={20} color={auroraTheme.colors.text.primary} />
            </GlassCard>
          </AnimatedPressable>
        </Animated.View>

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassCard variant="light" padding={auroraTheme.spacing.sm} style={{ marginBottom: auroraTheme.spacing.md }}>
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
              color={auroraTheme.colors.success[500]}
            />
            <Text style={styles.emptyText}>No variances found</Text>
            <Text style={styles.emptySubtext}>All items match system quantities</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={variances}
              renderItem={renderVarianceItem}
              // @ts-ignore
              estimatedItemSize={180}
              keyExtractor={(item, index) => `${item.item_code}-${item.verified_at}-${index}`}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={auroraTheme.colors.primary[500]}
                  colors={[auroraTheme.colors.primary[500]]}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading && variances.length > 0 ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={auroraTheme.colors.primary[500]} />
                  </View>
                ) : (
                  <View style={{ height: 20 }} />
                )
              }
            />
          </View>
        )}
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
  exportButton: {
    //
  },
  listContent: {
    paddingBottom: auroraTheme.spacing.xl,
  },
  varianceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.md,
  },
  varianceHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  },
  itemCode: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.tertiary,
  },
  varianceBadge: {
    borderRadius: auroraTheme.borderRadius.full,
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: "center",
    justifyContent: 'center',
  },
  varianceBadgeText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "bold",
  },
  varianceDetails: {
    //
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: 'center',
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: auroraTheme.spacing.sm,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  qtyItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: auroraTheme.colors.border.light,
  },
  qtyLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qtyValue: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary, // Subtle for System, Primary/Highlight for Verified
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    marginBottom: 4,
  },
  locationText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
  },
  categoryText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: auroraTheme.spacing.xs,
    marginTop: 2,
  },
  verificationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    marginTop: auroraTheme.spacing.xs,
    paddingTop: auroraTheme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.light,
  },
  verificationInfoText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
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
});
