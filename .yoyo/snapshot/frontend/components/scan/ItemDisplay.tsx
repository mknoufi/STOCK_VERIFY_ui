/**
 * ItemDisplay Component
 * Displays item information, stock quantity, MRP, and verification status
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '@/types/scan';

interface ItemDisplayProps {
  item: Item;
  refreshingStock?: boolean;
  onRefreshStock?: () => void;
}

export const ItemDisplay: React.FC<ItemDisplayProps> = React.memo(({
  item,
  refreshingStock = false,
  onRefreshStock,
}) => {
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>{item.name}</Text>
      {item.item_code && <Text style={styles.itemCode}>Code: {item.item_code}</Text>}
      {item.barcode && <Text style={styles.itemBarcode}>Barcode: {item.barcode}</Text>}

      {/* Additional Item Information */}
      <View style={styles.itemInfoGrid}>
        {item.category && (
          <View style={styles.itemInfoItem}>
            <Ionicons name="pricetag" size={14} color="#666" />
            <Text style={styles.itemInfoText}>
              {item.category}
              {item.subcategory && ` • ${item.subcategory}`}
            </Text>
          </View>
        )}
        {item.item_type && (
          <View style={styles.itemInfoItem}>
            <Ionicons name="layers" size={14} color="#666" />
            <Text style={styles.itemInfoText}>Type: {item.item_type}</Text>
          </View>
        )}
        {item.item_group && (
          <View style={styles.itemInfoItem}>
            <Ionicons name="albums" size={14} color="#666" />
            <Text style={styles.itemInfoText}>Group: {item.item_group}</Text>
          </View>
        )}
      </View>

      {/* Location Display */}
      {(item.location || (item as any).floor || (item as any).rack) && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.locationText}>
            {[(item as any).floor, (item as any).rack, item.location].filter(Boolean).join(' / ')}
          </Text>
        </View>
      )}

      {/* Verification Badge */}
      {(item as any).verified && (
        <View style={styles.verificationBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
          <Text style={styles.verificationText}>
            Verified by {(item as any).verified_by || 'Unknown'}
            {(item as any).verified_at && (
              <Text style={styles.verificationTime}>
                {' '}• {new Date((item as any).verified_at).toLocaleString()}
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Stock and MRP Row */}
      <View style={styles.qtyRow}>
        <View style={styles.qtyBox}>
          <View style={styles.qtyHeader}>
            <Text style={styles.qtyLabel}>ERP Stock</Text>
            {onRefreshStock && (
              <TouchableOpacity
                style={[styles.refreshButton, refreshingStock && styles.refreshButtonDisabled]}
                onPress={onRefreshStock}
                disabled={refreshingStock}
              >
                {refreshingStock ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.qtyValue}>{item.stock_qty ?? item.quantity ?? 0}</Text>
          {item.uom_name && <Text style={styles.uomText}>{item.uom_name}</Text>}
        </View>
        <View style={styles.qtyBox}>
          <Text style={styles.qtyLabel}>MRP</Text>
          <Text style={styles.qtyValue}>₹{item.mrp ?? '0.00'}</Text>
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.stock_qty === nextProps.item.stock_qty &&
    prevProps.item.mrp === nextProps.item.mrp &&
    prevProps.refreshingStock === nextProps.refreshingStock
  );
});

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  itemCode: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  itemBarcode: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  itemInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  itemInfoItem: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemInfoText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  verificationText: {
    color: '#3B82F6',
    fontSize: 14,
    flex: 1,
  },
  verificationTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
  },
  qtyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  refreshButton: {
    padding: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  uomText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
});
