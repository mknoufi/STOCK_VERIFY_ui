/**
 * Inventory Management Screen
 * Provides access to:
 * - Expiry alerts
 * - Low stock alerts
 * - Stock summary
 * - Category breakdown
 * - Text search
 * - CSV exports
 * - Manual sync trigger
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  ScreenContainer,
  GlassCard,
  LoadingSpinner,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";
import InventoryAPI, {
  ExpiryAlertItem,
  LowStockItem,
  CategorySummary,
  SearchResult,
} from "../../src/domains/inventory/services/inventoryApi";
import { notify } from "../../src/services/utils/notificationService";

type TabType = "expiry" | "lowstock" | "categories" | "search";

interface TabConfig {
  key: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const TABS: TabConfig[] = [
  { key: "expiry", label: "Expiring Soon", icon: "calendar-outline", color: auroraTheme.colors.warning[500] },
  { key: "lowstock", label: "Low Stock", icon: "trending-down-outline", color: auroraTheme.colors.error[500] },
  { key: "categories", label: "Categories", icon: "folder-outline", color: auroraTheme.colors.primary[500] },
  { key: "search", label: "Search", icon: "search-outline", color: auroraTheme.colors.accent[500] },
];

export default function InventoryManagement() {
  const _router = useRouter();
  const theme = auroraTheme;

  const [activeTab, setActiveTab] = useState<TabType>("expiry");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [expiryItems, setExpiryItems] = useState<ExpiryAlertItem[]>([]);
  const [expiryTotal, setExpiryTotal] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [lowStockTotal, setLowStockTotal] = useState(0);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);

  // Settings
  const expiryDays = 30;
  const stockThreshold = 10;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [expiryRes, lowStockRes, categoryRes] = await Promise.all([
        InventoryAPI.getExpiryAlerts(expiryDays),
        InventoryAPI.getLowStock(stockThreshold),
        InventoryAPI.getCategorySummary(),
      ]);

      setExpiryItems(expiryRes.items);
      setExpiryTotal(expiryRes.total);
      setLowStockItems(lowStockRes.items);
      setLowStockTotal(lowStockRes.total);
      setCategories(categoryRes.categories);
      setCategoriesTotal(categoryRes.total_categories);
    } catch (error: unknown) {
      console.error("Failed to fetch inventory data:", error);
    } finally {
      setLoading(false);
    }
  }, [expiryDays, stockThreshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Search functionality
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    try {
      setSearchLoading(true);
      const res = await InventoryAPI.textSearch(searchQuery, 50);
      setSearchResults(res.results);
      setSearchTotal(res.total);
    } catch (error: unknown) {
      console.error("Search failed:", error);
      Alert.alert("Search Error", "Failed to search inventory");
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // Trigger sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      notify.syncStarted();
      const result = await InventoryAPI.triggerSync();
      
      if (result.success) {
        notify.syncComplete(result.result?.inserted || 0, 0);
        Alert.alert("Sync Complete", result.message || "ERP sync completed successfully");
        await fetchData(); // Refresh data
      } else {
        notify.syncFailed(result.error);
        Alert.alert("Sync Failed", result.error || "Unknown error");
      }
    } catch (error: unknown) {
      console.error("Sync error:", error);
      notify.syncFailed();
      Alert.alert("Sync Error", "Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  // Export functions
  const handleExportExpiry = async () => {
    try {
      setExporting(true);
      const blob = await InventoryAPI.exportExpiryCsv(expiryDays);
      await saveAndShareCsv(blob, `expiring_items_${expiryDays}d.csv`);
    } catch (error: unknown) {
      console.error("Export expiry error:", error);
      const message = error instanceof Error ? error.message : "Failed to export expiry report";
      Alert.alert("Export Error", message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportLowStock = async () => {
    try {
      setExporting(true);
      const blob = await InventoryAPI.exportLowStockCsv(stockThreshold);
      await saveAndShareCsv(blob, `low_stock_${stockThreshold}.csv`);
    } catch (error: unknown) {
      console.error("Export low stock error:", error);
      const message = error instanceof Error ? error.message : "Failed to export low stock report";
      Alert.alert("Export Error", message);
    } finally {
      setExporting(false);
    }
  };

  const saveAndShareCsv = async (blob: Blob, filename: string) => {
    if (Platform.OS === "web") {
      InventoryAPI.downloadBlob(blob, filename);
      return;
    }
    
    // For native, save and share using new expo-file-system API
    const text = await blob.text();
    const file = new File(Paths.cache, filename);
    file.write(text);
    const fileUri = file.uri;
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: `Export ${filename}`,
      });
    } else {
      Alert.alert("Saved", `File saved to ${fileUri}`);
    }
  };

  // Render search result item
  const renderSearchItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <GlassCard style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.item_name}
            </Text>
            <Text style={styles.itemCode}>{item.item_code}</Text>
          </View>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: theme.colors.accent[500] },
            ]}
          >
            <Ionicons name="cube-outline" size={14} color="#fff" />
            <Text style={styles.stockBadgeText}>{item.stock_qty}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Barcode:</Text>
            <Text style={styles.detailValue}>{item.barcode}</Text>
          </View>
          {item.brand_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Brand:</Text>
              <Text style={styles.detailValue}>{item.brand_name}</Text>
            </View>
          )}
          {item.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{item.category}</Text>
            </View>
          )}
          {item.expiry_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expiry:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.expiry_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );

  const renderExpiryItem = ({ item, index }: { item: ExpiryAlertItem; index: number }) => {
    const isUrgent = item.days_until_expiry <= 7;
    const isWarning = item.days_until_expiry <= 14;
    
    // Extract badge color to avoid nested ternary
    const getBadgeColor = () => {
      if (isUrgent) return theme.colors.error[500];
      if (isWarning) return theme.colors.warning[500];
      return theme.colors.success[500];
    };

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <GlassCard style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.item_name}
              </Text>
              <Text style={styles.itemCode}>{item.item_code}</Text>
            </View>
            <View
              style={[
                styles.expiryBadge,
                { backgroundColor: getBadgeColor() },
              ]}
            >
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.expiryBadgeText}>
                {item.days_until_expiry}d
              </Text>
            </View>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barcode:</Text>
              <Text style={styles.detailValue}>{item.barcode}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stock:</Text>
              <Text style={styles.detailValue}>
                {item.stock_qty} {item.uom_name || "units"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expiry:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.expiry_date).toLocaleDateString()}
              </Text>
            </View>
            {item.batch_no && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Batch:</Text>
                <Text style={styles.detailValue}>{item.batch_no}</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  const renderLowStockItem = ({ item, index }: { item: LowStockItem; index: number }) => {
    const isCritical = item.stock_qty <= 5;

    const badgeColor = isCritical ? theme.colors.error[500] : theme.colors.warning[500];

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <GlassCard style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.item_name}
              </Text>
              <Text style={styles.itemCode}>{item.item_code}</Text>
            </View>
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: badgeColor,
                },
              ]}
            >
              <Ionicons name="cube-outline" size={14} color="#fff" />
              <Text style={styles.stockBadgeText}>{item.stock_qty}</Text>
            </View>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barcode:</Text>
              <Text style={styles.detailValue}>{item.barcode}</Text>
            </View>
            {item.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{item.category}</Text>
              </View>
            )}
            {item.brand_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Brand:</Text>
                <Text style={styles.detailValue}>{item.brand_name}</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  const renderCategoryItem = ({ item, index }: { item: CategorySummary; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <GlassCard style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <Ionicons
            name="folder-outline"
            size={24}
            color={theme.colors.primary[500]}
          />
          <Text style={styles.categoryName}>{item.category || "Uncategorized"}</Text>
        </View>
        <View style={styles.categoryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_items.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_stock.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Stock</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(item.avg_stock)}</Text>
            <Text style={styles.statLabel}>Avg/Item</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <GlassCard style={[styles.summaryCard, { borderLeftColor: theme.colors.warning[500] }]}>
        <Ionicons name="calendar-outline" size={28} color={theme.colors.warning[500]} />
        <Text style={styles.summaryValue}>{expiryTotal}</Text>
        <Text style={styles.summaryLabel}>Expiring ({expiryDays}d)</Text>
      </GlassCard>

      <GlassCard style={[styles.summaryCard, { borderLeftColor: theme.colors.error[500] }]}>
        <Ionicons name="trending-down-outline" size={28} color={theme.colors.error[500]} />
        <Text style={styles.summaryValue}>{lowStockTotal}</Text>
        <Text style={styles.summaryLabel}>Low Stock (&lt;{stockThreshold})</Text>
      </GlassCard>

      <GlassCard style={[styles.summaryCard, { borderLeftColor: theme.colors.primary[500] }]}>
        <Ionicons name="folder-outline" size={28} color={theme.colors.primary[500]} />
        <Text style={styles.summaryValue}>{categoriesTotal}</Text>
        <Text style={styles.summaryLabel}>Categories</Text>
      </GlassCard>
    </View>
  );

  const renderActionBar = () => (
    <View style={styles.actionBar}>
      <TouchableOpacity
        style={[styles.actionButton, syncing && styles.actionButtonDisabled]}
        onPress={handleSync}
        disabled={syncing || exporting}
      >
        <Ionicons
          name={syncing ? "sync" : "sync-outline"}
          size={18}
          color={syncing ? theme.colors.text.tertiary : theme.colors.primary[500]}
        />
        <Text style={[styles.actionButtonText, syncing && styles.actionButtonTextDisabled]}>
          {syncing ? "Syncing..." : "Sync ERP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, exporting && styles.actionButtonDisabled]}
        onPress={handleExportExpiry}
        disabled={syncing || exporting}
      >
        <Ionicons
          name="download-outline"
          size={18}
          color={exporting ? theme.colors.text.tertiary : theme.colors.warning[500]}
        />
        <Text style={[styles.actionButtonText, exporting && styles.actionButtonTextDisabled]}>
          Export Expiry
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, exporting && styles.actionButtonDisabled]}
        onPress={handleExportLowStock}
        disabled={syncing || exporting}
      >
        <Ionicons
          name="download-outline"
          size={18}
          color={exporting ? theme.colors.text.tertiary : theme.colors.error[500]}
        />
        <Text style={[styles.actionButtonText, exporting && styles.actionButtonTextDisabled]}>
          Export Low Stock
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => {
    // Helper function to get tab count - avoids nested ternary
    const getTabCount = (key: TabType): number => {
      switch (key) {
        case "expiry": return expiryTotal;
        case "lowstock": return lowStockTotal;
        case "search": return searchTotal;
        case "categories": return categoriesTotal;
        default: return 0;
      }
    };

    return (
      <View style={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key);

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { backgroundColor: tab.color + "20", borderColor: tab.color },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? tab.color : theme.colors.text.secondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && { color: tab.color, fontWeight: "600" },
                ]}
              >
                {tab.label}
            </Text>
            {count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: tab.color }]}>
                <Text style={styles.tabBadgeText}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
    );
  };

  // Helper function for search results content - avoids nested ternary
  const renderSearchResults = () => {
    if (searchLoading) {
      return <LoadingSpinner />;
    }
    
    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>
            {searchQuery ? "No results found" : "Enter a search term"}
          </Text>
        </View>
      );
    }
    
    return (
      <FlashList
        data={searchResults}
        renderItem={renderSearchItem}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  const renderSearchTab = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, brands, barcodes..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setSearchResults([]);
              setSearchTotal(0);
            }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {renderSearchResults()}
    </View>
  );

  const renderExpiryTab = () => {
    if (expiryItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="checkmark-circle-outline"
            size={64}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.emptyText}>No items expiring soon</Text>
        </View>
      );
    }

    return (
      <FlashList
        data={expiryItems}
        renderItem={renderExpiryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  const renderLowStockTab = () => {
    if (lowStockItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="thumbs-up-outline" size={64} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>All items well stocked</Text>
        </View>
      );
    }

    return (
      <FlashList
        data={lowStockItems}
        renderItem={renderLowStockItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  const renderCategoriesTab = () => {
    if (categories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>No categories found</Text>
        </View>
      );
    }

    return (
      <FlashList
        data={categories}
        renderItem={renderCategoryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    switch (activeTab) {
      case "search":
        return renderSearchTab();
      case "expiry":
        return renderExpiryTab();
      case "lowstock":
        return renderLowStockTab();
      case "categories":
      default:
        return renderCategoriesTab();
    }
  };

  return (
    <ScreenContainer
      header={{
        title: "Inventory Management",
        showBackButton: true,
        showLogoutButton: true,
      }}
      backgroundType="aurora"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[1]}
      >
        {renderSummaryCards()}
        {renderTabs()}
        {renderActionBar()}
        <View style={styles.listContainer}>{renderContent()}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  summaryGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderLeftWidth: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: auroraTheme.colors.background.primary,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  listContainer: {
    flex: 1,
    minHeight: 400,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  itemCard: {
    marginBottom: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  expiryBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  itemDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: auroraTheme.colors.text.secondary,
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    color: auroraTheme.colors.text.primary,
    flex: 1,
  },
  categoryCard: {
    marginBottom: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    flex: 1,
  },
  categoryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: auroraTheme.colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: auroraTheme.colors.border.light,
    marginHorizontal: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: auroraTheme.colors.text.secondary,
    marginTop: 16,
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: auroraTheme.colors.background.secondary,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.background.tertiary,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: auroraTheme.colors.text.primary,
  },
  actionButtonTextDisabled: {
    color: auroraTheme.colors.text.tertiary,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: auroraTheme.colors.text.primary,
  },
});
