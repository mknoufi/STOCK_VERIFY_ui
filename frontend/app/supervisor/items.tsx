/**
 * Filtered Items Screen
 * View and filter all items with category, subcategory, floor, rack, UOM filters
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ItemVerificationAPI } from '../../services/itemVerificationApi';
import { ItemFilters, FilterValues } from '../../components/ItemFilters';
import { exportItemsToCSV, downloadCSV } from '../../utils/csvExport';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const getLocalFileUri = (filename: string) => {
  const baseDir =
    FileSystem.Paths?.document?.uri ??
    FileSystem.Paths?.cache?.uri ??
    '';
  return `${baseDir}${filename}`;
};

export default function ItemsScreen() {
  const router = useRouter();
  const theme = useTheme();
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

  const loadItems = React.useCallback(async (reset = false) => {
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
      // Error logged via error handler
      Alert.alert('Error', error.message || 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, pagination.limit, pagination.skip]);

  useEffect(() => {
    loadItems(true);
  }, [loadItems]);

  const handleRefresh = () => {
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

  const handleExportCSV = async () => {
    try {
      if (items.length === 0) {
        Alert.alert('No Data', 'There are no items to export');
        return;
      }

      // Try to get all items if we have filters
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
      const filename = `items_export_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        downloadCSV(csvContent, filename);
        Alert.alert('Success', 'CSV file downloaded');
      } else {
        const fileUri = getLocalFileUri(filename);
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: 'utf8',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', `File saved to: ${fileUri}`);
        }
      }
    } catch (error: any) {
      // Error logged via error handler
      Alert.alert('Error', error.message || 'Failed to export CSV');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          // Could navigate to item detail
        }}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={[styles.itemName, { color: theme.colors.text }]}>
              {item.item_name}
            </Text>
            <Text style={[styles.itemCode, { color: theme.colors.textSecondary }]}>
              {item.item_code}
            </Text>
          </View>
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Stock:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {item.stock_qty?.toFixed(2) || '0.00'} {item.uom_name || ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              MRP:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              ₹{item.mrp?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {(item.floor || item.rack) && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
              {[item.floor, item.rack].filter(Boolean).join(' / ')}
            </Text>
          </View>
        )}

        {item.category && (
          <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
            {item.category}
            {item.subcategory && ` • ${item.subcategory}`}
          </Text>
        )}

        {item.verified && item.verified_by && (
          <View style={styles.verificationInfo}>
            <Ionicons name="person" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.verificationInfoText, { color: theme.colors.textSecondary }]}>
              Verified by {item.verified_by}
              {item.verified_at && ` • ${new Date(item.verified_at).toLocaleDateString()}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading items...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Items
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportCSV}
            disabled={items.length === 0}
          >
            <Ionicons name="download" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
            {pagination.total} items
          </Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {statistics.total_items}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Items
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {statistics.verified_items}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Verified
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {statistics.total_qty.toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Qty
          </Text>
        </View>
      </View>

      <ItemFilters
        onFilterChange={setFilters}
        showVerifiedFilter={true}
        showSearch={true}
      />

      {items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={64} color={theme.colors.placeholder} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No items found
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.placeholder }]}>
            Try adjusting your filters
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.item_code}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && items.length > 0 ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    padding: 8,
  },
  headerCount: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
  },
  verifiedBadge: {
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#00E676',
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailRow: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
  },
  categoryText: {
    fontSize: 13,
    marginTop: 4,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  verificationInfoText: {
    fontSize: 11,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
