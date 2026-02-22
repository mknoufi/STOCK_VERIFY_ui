/**
 * ItemDetailCard Component
 * Unified item display card for all detail screens
 * Provides consistent item information display across the application
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { GlassCard } from "../ui/GlassCard";
import { theme } from "../../styles/modernDesignSystem";
import { RefreshButton } from "../RefreshButton";

// ============================================================================
// Types
// ============================================================================

export interface ItemData {
  item_code?: string;
  item_name?: string;
  name?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  item_type?: string;
  item_group?: string;
  floor?: string;
  rack?: string;
  location?: string;
  stock_qty?: number;
  current_stock?: number;
  quantity?: number;
  erp_qty?: number;
  counted_qty?: number;
  verified_qty?: number;
  variance?: number;
  mrp?: number;
  sales_price?: number;
  sale_price?: number;
  uom_name?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string | Date;
  condition?: string;
  damaged_qty?: number;
  photo_url?: string;
  serial_numbers?: { serial_number: string; label?: string }[];
  manufacturing_date?: string;
  expiry_date?: string;
  remark?: string;
}

export interface ItemDetailCardProps {
  item: ItemData;
  variant?: "compact" | "full" | "list";
  showStock?: boolean;
  showPrices?: boolean;
  showLocation?: boolean;
  showVerificationStatus?: boolean;
  showVariance?: boolean;
  showCondition?: boolean;
  showRefreshButton?: boolean;
  refreshingStock?: boolean;
  onRefreshStock?: () => void;
  onPress?: () => void;
  animationDelay?: number;
  style?: any;
}

// ============================================================================
// Subcomponents
// ============================================================================

const ItemHeader: React.FC<{
  item: ItemData;
  onPress?: () => void;
}> = ({ item, onPress }) => {
  const displayName = item.item_name || item.name || "Unknown Item";
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={styles.headerContainer}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.itemIconContainer}>
        <Ionicons
          name="cube-outline"
          size={28}
          color={theme.colors.primary[500]}
        />
      </View>
      <View style={styles.headerTextContainer}>
        <Text style={styles.itemName} numberOfLines={2}>
          {displayName}
        </Text>
        {item.item_code && (
          <Text style={styles.itemCode}>Code: {item.item_code}</Text>
        )}
        {item.barcode && (
          <Text style={styles.barcode}>{item.barcode}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const StockDisplay: React.FC<{
  item: ItemData;
  showRefreshButton?: boolean;
  refreshingStock?: boolean;
  onRefreshStock?: () => void;
}> = ({ item, showRefreshButton, refreshingStock, onRefreshStock }) => {
  const stockValue = item.stock_qty ?? item.current_stock ?? item.quantity ?? 0;
  
  return (
    <View style={styles.stockContainer}>
      <View style={styles.stockHeader}>
        <Text style={styles.stockLabel}>ERP Stock</Text>
        {showRefreshButton && onRefreshStock && (
          <RefreshButton
            onRefresh={onRefreshStock}
            loading={refreshingStock}
            size={18}
            hapticFeedback={true}
            style={styles.refreshButton}
            iconName="refresh"
            accessibilityLabel="Refresh stock count"
          />
        )}
      </View>
      <Text style={styles.stockValue}>{stockValue}</Text>
      {item.uom_name && (
        <Text style={styles.uomText}>{item.uom_name}</Text>
      )}
    </View>
  );
};

const PriceDisplay: React.FC<{ item: ItemData }> = ({ item }) => {
  const salePrice = item.sale_price ?? item.sales_price ?? 0;
  const mrp = item.mrp ?? 0;
  
  return (
    <View style={styles.pricesContainer}>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Sale Price</Text>
        <Text style={styles.priceValue}>₹{salePrice}</Text>
      </View>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>MRP</Text>
        <Text style={styles.priceValue}>₹{mrp}</Text>
      </View>
    </View>
  );
};

const VarianceDisplay: React.FC<{ item: ItemData }> = ({ item }) => {
  const erpQty = item.erp_qty ?? item.stock_qty ?? 0;
  const countedQty = item.counted_qty ?? item.verified_qty ?? 0;
  const variance = item.variance ?? (countedQty - erpQty);
  
  const varianceColor = variance === 0 
    ? theme.colors.success.main 
    : theme.colors.error.main;
  
  return (
    <View style={styles.varianceContainer}>
      <View style={styles.varianceItem}>
        <Text style={styles.varianceLabel}>ERP Qty</Text>
        <Text style={styles.varianceValue}>{erpQty}</Text>
      </View>
      <View style={styles.varianceItem}>
        <Text style={styles.varianceLabel}>Counted</Text>
        <Text style={styles.varianceValue}>{countedQty}</Text>
      </View>
      <View style={styles.varianceItem}>
        <Text style={styles.varianceLabel}>Variance</Text>
        <Text style={[styles.varianceValue, { color: varianceColor }]}>
          {variance > 0 ? "+" : ""}{variance}
        </Text>
      </View>
    </View>
  );
};

const LocationDisplay: React.FC<{ item: ItemData }> = ({ item }) => {
  const locationParts = [item.floor, item.rack, item.location].filter(Boolean);
  
  if (locationParts.length === 0) return null;
  
  return (
    <View style={styles.locationContainer}>
      <Ionicons name="location-outline" size={16} color={theme.colors.text.tertiary} />
      <Text style={styles.locationText}>{locationParts.join(" / ")}</Text>
    </View>
  );
};

const CategoryDisplay: React.FC<{ item: ItemData }> = ({ item }) => {
  if (!item.category) return null;
  
  return (
    <View style={styles.categoryContainer}>
      <Ionicons name="pricetag-outline" size={14} color={theme.colors.text.tertiary} />
      <Text style={styles.categoryText}>
        {item.category}
        {item.subcategory && ` • ${item.subcategory}`}
      </Text>
    </View>
  );
};

const VerificationBadge: React.FC<{ item: ItemData }> = ({ item }) => {
  if (!item.verified) return null;
  
  const verifiedAt = item.verified_at
    ? new Date(item.verified_at).toLocaleString()
    : null;
  
  return (
    <View style={styles.verificationBadge}>
      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success.main} />
      <Text style={styles.verificationText}>
        Verified by {item.verified_by || "Unknown"}
        {verifiedAt && (
          <Text style={styles.verificationTime}> • {verifiedAt}</Text>
        )}
      </Text>
    </View>
  );
};

const ConditionDisplay: React.FC<{ item: ItemData }> = ({ item }) => {
  const condition = item.condition || "Good";
  const damagedQty = item.damaged_qty || 0;
  
  const getConditionColor = () => {
    switch (condition.toLowerCase()) {
      case "good":
      case "new":
        return theme.colors.success.main;
      case "damaged":
        return theme.colors.error.main;
      default:
        return theme.colors.warning.main;
    }
  };
  
  return (
    <View style={styles.conditionContainer}>
      <View style={[styles.conditionBadge, { backgroundColor: getConditionColor() + "20" }]}>
        <Text style={[styles.conditionText, { color: getConditionColor() }]}>
          {condition}
        </Text>
      </View>
      {damagedQty > 0 && (
        <View style={[styles.conditionBadge, { backgroundColor: theme.colors.error.main + "20" }]}>
          <Text style={[styles.conditionText, { color: theme.colors.error.main }]}>
            Damaged: {damagedQty}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemDetailCard: React.FC<ItemDetailCardProps> = ({
  item,
  variant = "full",
  showStock = true,
  showPrices = true,
  showLocation = true,
  showVerificationStatus = true,
  showVariance = false,
  showCondition = false,
  showRefreshButton = false,
  refreshingStock = false,
  onRefreshStock,
  onPress,
  animationDelay = 0,
  style,
}) => {
  const isCompact = variant === "compact";
  const _isList = variant === "list";
  
  const content = (
    <GlassCard
      intensity={15}
      padding={isCompact ? theme.spacing.sm : theme.spacing.md}
      borderRadius={theme.borderRadius.lg}
      style={[styles.card, style]}
    >
      <ItemHeader item={item} onPress={onPress} />
      
      <CategoryDisplay item={item} />
      
      {showLocation && <LocationDisplay item={item} />}
      
      {showVerificationStatus && <VerificationBadge item={item} />}
      
      {!isCompact && showVariance && <VarianceDisplay item={item} />}
      
      {!isCompact && !showVariance && (
        <View style={styles.statsRow}>
          {showStock && (
            <StockDisplay
              item={item}
              showRefreshButton={showRefreshButton}
              refreshingStock={refreshingStock}
              onRefreshStock={onRefreshStock}
            />
          )}
          {showPrices && <PriceDisplay item={item} />}
        </View>
      )}
      
      {showCondition && <ConditionDisplay item={item} />}
      
      {item.remark && (
        <View style={styles.remarkContainer}>
          <Text style={styles.remarkLabel}>Remark:</Text>
          <Text style={styles.remarkText}>{item.remark}</Text>
        </View>
      )}
    </GlassCard>
  );
  
  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
        {content}
      </Animated.View>
    );
  }
  
  return content;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.sm,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[500] + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.primary[500] + "40",
  },
  headerTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  barcode: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  categoryText: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    fontStyle: "italic",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.success.main + "15",
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  verificationText: {
    fontSize: 13,
    color: theme.colors.success.main,
    flex: 1,
  },
  verificationTime: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  stockContainer: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: theme.spacing.xs,
  },
  stockLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 4,
  },
  stockValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  uomText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  pricesContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  priceBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  varianceContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  varianceItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  varianceLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  varianceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  conditionContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  conditionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  remarkContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.borderRadius.sm,
  },
  remarkLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  remarkText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});

export default ItemDetailCard;
