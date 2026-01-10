/**
 * Filtered Items Screen - Refactored with Shared Components
 * Uses unified ItemDetailCard for consistent item display
 */
import React, { useState, useEffect, useCallback } from "react";
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

import { ItemVerificationAPI } from "../../src/domains/inventory/services/itemVerificationApi";
import { ItemFilters, FilterValues } from "../../src/domains/inventory/components/ItemFilters";
import { exportItemsToCSV, downloadCSV } from "../../src/utils/csvExport";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import {
  ItemDetailCard,
  ItemStatsRow,
  ItemQuickActions,
  createStockStats,
} from "../../src/components/items";
import { theme } from "../../src/styles/modernDesignSystem";

const getLocalFileUri = (filename: string) => {
  const baseDir = FileSystem.Paths?.document?.uri ?? FileSystem.Paths?.cache?.uri ?? "";
  return `${baseDir}${filename}`;
};

export default function ItemsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    skip: 0,
  });
  const [statistics, setStatistics] = useState({
    total_items: 0,
    verified_items: 0,
    unverified_items: 0,
    total_qty: 0,
  });

  // ========================================================================
  // Data Loading
  // ========================================================================
  const loadItems = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          setPagination((prev) => ({ ...prev, skip: 0 }));
        }

        const skip = reset ? 0 : pagination.skip;
        const response = await ItemVerificationAPI.getFilteredItems({
          ...filters,
          limit: pagination.limit,
          skip,
        });

        if (reset) {
          setItems(response.items);
        } else {
          setItems((prev) => [...prev, ...response.items]);
        }

        setPagination(response.pagination);
        setStatistics(response.statistics);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load items");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, pagination.limit, pagination.skip]
  );

  useEffect(() => {
    loadItems(true);
  }, [loadItems]);

  const handleRefresh = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    loadItems(true);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.skip + pagination.limit < pagination.total) {
      setPagination((prev) => ({
        ...prev,
        skip: prev.skip + prev.limit,
      }));
      loadItems(false);
    }
  };

  // ========================================================================
  // Export
  // ========================================================================
  const handleExportCSV = async () => {
    try {
      if (items.length === 0) {
        Alert.alert("No Data", "There are no items to export");
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      let allItems = items;
      if (pagination.total > items.length) {
        const response = await ItemVerificationAPI.getFilteredItems({
          ...filters,
          limit: pagination.total,
          skip: 0,
        });
        allItems = response.items;
      }

      const csvContent = exportItemsToCSV(allItems);
      const filename = `items_export_${new Date().toISOString().split("T")[0]}.csv`;

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

  // ========================================================================
  // Item Navigation
  // ========================================================================
  const handleItemPress = (item: any) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    // Navigate to variance details if there's a variance
    if (item.variance !== undefined && item.variance !== 0) {
      router.push({
        pathname: "/supervisor/variance-details",
        params: { itemCode: item.item_code },
      });
    }
  };

  // ========================================================================
  // Render
  // ========================================================================
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Only animate first 10 items for performance
    const animationDelay = index < 10 ? 100 + index * 50 : 0;
    
    return (
      <ItemDetailCard
        item={{
          item_code: item.item_code,
          item_name: item.item_name,
          barcode: item.barcode,
          category: item.category,
          subcategory: item.subcategory,
          floor: item.floor,
          rack: item.rack,
          stock_qty: item.stock_qty,
          mrp: item.mrp,
          sales_price: item.sales_price,
          uom_name: item.uom_name,
          verified: item.verified,
          verified_by: item.verified_by,
          verified_at: item.verified_at,
        }}
        variant="compact"
        showStock={true}
        showPrices={true}
        showLocation={true}
        showVerificationStatus={true}
        onPress={() => handleItemPress(item)}
        animationDelay={animationDelay}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="cube-outline"
        size={64}
        color={theme.colors.text.tertiary}
      />
      <Text style={styles.emptyText}>No items found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
    </View>
  );

  return (
    <ScreenContainer
      header={{
        title: "Items",
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
        {/* Header with Export Button */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Items</Text>
            <Text style={styles.pageSubtitle}>
              {pagination.total} items listed
            </Text>
          </View>

          <AnimatedPressable
            style={[styles.exportButton, items.length === 0 && { opacity: 0.5 }]}
            onPress={handleExportCSV}
            disabled={items.length === 0}
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

        {/* Statistics Row */}
        <ItemStatsRow
          stats={createStockStats(
            statistics.total_items,
            statistics.verified_items,
            statistics.total_qty
          )}
          animationDelay={200}
          style={styles.statsRow}
        />

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <GlassCard
            intensity={10}
            padding={theme.spacing.sm}
            style={styles.filtersCard}
          >
            <ItemFilters
              onFilterChange={setFilters}
              showVerifiedFilter={true}
              showSearch={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Item List */}
        {items.length === 0 && !loading ? (
          renderEmpty()
        ) : (
          <View style={styles.listContainer}>
            <FlashList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item, index) => `${item.item_code}-${index}`}
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
                loading && items.length > 0 ? (
                  <View style={styles.loadingFooter}>
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

      {/* Quick Actions FAB */}
      <ItemQuickActions
        actions={[
          {
            id: "export",
            icon: "download-outline",
            label: "Export CSV",
            color: theme.colors.success.main,
            onPress: handleExportCSV,
          },
          {
            id: "refresh",
            icon: "refresh-outline",
            label: "Refresh",
            color: theme.colors.primary[500],
            onPress: handleRefresh,
          },
        ]}
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
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  exportButton: {},
  statsRow: {
    marginBottom: theme.spacing.md,
  },
  filtersCard: {
    marginBottom: theme.spacing.md,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
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
