/**
 * Variance List Screen
 * Displays all items with variances (verified qty != system qty)
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
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ItemVerificationAPI, VarianceItem } from '../../services/itemVerificationApi';
import { ItemFilters, FilterValues } from '../../components/ItemFilters';
import { exportVariancesToCSV, downloadCSV } from '../../utils/csvExport';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const getLocalFileUri = (filename: string) => {
  const baseDir =
    FileSystem.Paths?.document?.uri ??
    FileSystem.Paths?.cache?.uri ??
    '';
  return `${baseDir}${filename}`;
};

export default function VariancesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [variances, setVariances] = useState<VarianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    skip: 0,
  });

  const loadVariances = async (reset = false) => {
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
      // Error logged via error handler
      Alert.alert('Error', error.message || 'Failed to load variances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVariances(true);
  }, [filters]);

  const handleRefresh = () => {
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
        Alert.alert('No Data', 'There are no variances to export');
        return;
      }

      // Try to get all variances if we have filters
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
      const filename = `variances_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        downloadCSV(csvContent, filename);
        Alert.alert('Success', 'CSV file downloaded');
      } else {
        // For mobile, save to file system and share
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

  const renderVarianceItem = ({ item }: { item: VarianceItem }) => {
    const varianceColor = item.variance > 0 ? '#00E676' : '#FF5252';
    const varianceSign = item.variance > 0 ? '+' : '';

    return (
      <TouchableOpacity
        style={[styles.varianceCard, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          router.push({
            pathname: '/supervisor/variance-details',
            params: {
              itemCode: item.item_code,
              sessionId: item.session_id || 'current'
            }
          });
        }}
      >
        <View style={styles.varianceHeader}>
          <View style={styles.varianceHeaderLeft}>
            <Text style={[styles.itemName, { color: theme.colors.text }]}>
              {item.item_name}
            </Text>
            <Text style={[styles.itemCode, { color: theme.colors.textSecondary }]}>
              {item.item_code}
            </Text>
          </View>
          <View style={[styles.varianceBadge, { backgroundColor: varianceColor }]}>
            <Text style={styles.varianceBadgeText}>
              {varianceSign}{item.variance.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.varianceDetails}>
          <View style={styles.qtyRow}>
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: theme.colors.textSecondary }]}>
                System Qty
              </Text>
              <Text style={[styles.qtyValue, { color: theme.colors.text }]}>
                {item.system_qty.toFixed(2)}
              </Text>
            </View>
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: theme.colors.textSecondary }]}>
                Verified Qty
              </Text>
              <Text style={[styles.qtyValue, { color: theme.colors.text }]}>
                {item.verified_qty.toFixed(2)}
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

          <View style={styles.verificationInfo}>
            <Ionicons name="person" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.verificationInfoText, { color: theme.colors.textSecondary }]}>
              Verified by {item.verified_by} • {new Date(item.verified_at).toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && variances.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading variances...
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
          Item Variances
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportCSV}
            disabled={variances.length === 0}
          >
            <Ionicons name="download" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
            {pagination.total} items
          </Text>
        </View>
      </View>

      <ItemFilters
        onFilterChange={setFilters}
        showVerifiedFilter={false}
        showSearch={false}
      />

      {variances.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.placeholder} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No variances found
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.placeholder }]}>
            All items match system quantities
          </Text>
        </View>
      ) : (
        <FlashList
          data={variances}
          renderItem={renderVarianceItem}
          keyExtractor={(item, index) => `${item.item_code}-${item.verified_at}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && variances.length > 0 ? (
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
  listContent: {
    padding: 16,
  },
  varianceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  varianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  varianceHeaderLeft: {
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
  varianceBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  varianceBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  varianceDetails: {
    gap: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  qtyItem: {
    flex: 1,
  },
  qtyLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
  },
  categoryText: {
    fontSize: 13,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  verificationInfoText: {
    fontSize: 12,
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
