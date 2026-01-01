/**
 * ItemDisplay Component
 * Displays item information, stock quantity, MRP, and verification status
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Item } from "@/types/scan";
import Animated, { FadeInUp, Layout } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { flags } from "@/constants/flags";

interface ItemDisplayProps {
  item: Item;
  refreshingStock?: boolean;
  onRefreshStock?: () => void;
}

export const ItemDisplay: React.FC<ItemDisplayProps> = React.memo(
  ({ item, refreshingStock = false, onRefreshStock }) => {
    const Container = flags.enableAnimations ? Animated.View : View;
    const animatedProps = flags.enableAnimations
      ? {
          entering: FadeInUp.delay(100).springify().damping(12),
          layout: Layout.springify().damping(12),
        }
      : {};

    return (
      <Container style={[styles.itemCard, styles.shadow]} {...animatedProps}>
        <LinearGradient
          colors={["#1E293B", "#0F172A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.contentContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.item_code && (
            <Text style={styles.itemCode}>Code: {item.item_code}</Text>
          )}
          {item.barcode && (
            <Text style={styles.itemBarcode}>Barcode: {item.barcode}</Text>
          )}

          {/* Additional Item Information */}
          <View style={styles.itemInfoGrid}>
            {item.category && (
              <View style={styles.itemInfoItem}>
                <Ionicons name="pricetag" size={14} color="#94A3B8" />
                <Text style={styles.itemInfoText}>
                  {item.category}
                  {item.subcategory && ` • ${item.subcategory}`}
                </Text>
              </View>
            )}
            {item.item_type && (
              <View style={styles.itemInfoItem}>
                <Ionicons name="layers" size={14} color="#94A3B8" />
                <Text style={styles.itemInfoText}>Type: {item.item_type}</Text>
              </View>
            )}
            {item.item_group && (
              <View style={styles.itemInfoItem}>
                <Ionicons name="albums" size={14} color="#94A3B8" />
                <Text style={styles.itemInfoText}>
                  Group: {item.item_group}
                </Text>
              </View>
            )}
          </View>

          {/* Location Display */}
          {(item.location || (item as any).floor || (item as any).rack) && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#38BDF8" />
              <Text style={styles.locationText}>
                {[(item as any).floor, (item as any).rack, item.location]
                  .filter(Boolean)
                  .join(" / ")}
              </Text>
            </View>
          )}

          {/* Verification Badge */}
          {(item as any).verified && (
            <View style={styles.verificationBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
              <Text style={styles.verificationText}>
                Verified by {(item as any).verified_by || "Unknown"}
                {(item as any).verified_at && (
                  <Text style={styles.verificationTime}>
                    {" "}
                    • {new Date((item as any).verified_at).toLocaleString()}
                  </Text>
                )}
              </Text>
            </View>
          )}

          {/* Stock, Sales Price, and MRP Rows */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Left Column: ERP Stock */}
            <View style={{ flex: 1 }}>
              <View
                style={[
                  styles.qtyBox,
                  { height: "100%", justifyContent: "center" },
                ]}
              >
                <View style={styles.qtyHeader}>
                  <Text style={styles.qtyLabel}>ERP Stock</Text>
                  {onRefreshStock && (
                    <TouchableOpacity
                      style={[
                        styles.refreshButton,
                        refreshingStock && styles.refreshButtonDisabled,
                      ]}
                      onPress={onRefreshStock}
                      disabled={refreshingStock}
                    >
                      {refreshingStock ? (
                        <ActivityIndicator size="small" color="#38BDF8" />
                      ) : (
                        <Ionicons name="refresh" size={18} color="#38BDF8" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ alignItems: "center", gap: 0 }}>
                  <Text style={[styles.qtyValue, { fontSize: 32 }]}>
                    {item.stock_qty ?? item.quantity ?? 0}
                  </Text>
                  {item.uom_name && (
                    <Text style={[styles.uomText, { marginTop: 0 }]}>
                      {item.uom_name}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Right Column: Sales Price & MRP */}
            <View style={{ flex: 1, gap: 12 }}>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyLabel}>Sales Price</Text>
                <Text style={styles.qtyValueSmall}>
                  ₹{item.sale_price ?? item.sales_price ?? "0.00"}
                </Text>
              </View>

              <View style={styles.qtyBox}>
                <Text style={styles.qtyLabel}>MRP</Text>
                <Text style={styles.qtyValueSmall}>₹{item.mrp ?? "0.00"}</Text>
              </View>
            </View>
          </View>
        </View>
      </Container>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.stock_qty === nextProps.item.stock_qty &&
      prevProps.item.mrp === nextProps.item.mrp &&
      prevProps.item.sale_price === nextProps.item.sale_price &&
      prevProps.item.sales_price === nextProps.item.sales_price &&
      prevProps.refreshingStock === nextProps.refreshingStock
    );
  },
);

ItemDisplay.displayName = "ItemDisplay";

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      },
    }),
  },
  contentContainer: {
    padding: 24,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  itemCode: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  itemBarcode: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 12,
    fontFamily: "monospace",
  },
  itemInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  itemInfoItem: {
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemInfoText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a3a1a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  verificationText: {
    color: "#3B82F6",
    fontSize: 14,
    flex: 1,
  },
  verificationTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
  qtyRow: {
    flexDirection: "row",
    gap: 12,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 16,
  },
  qtyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qtyLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  refreshButton: {
    padding: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  qtyValueSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  uomText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
});
