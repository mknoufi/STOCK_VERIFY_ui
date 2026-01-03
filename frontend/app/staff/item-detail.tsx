/**
 * Modern Item Detail Screen - Lavanya Mart Stock Verify
 * Clean, efficient item verification interface
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useScanSessionStore } from "../../src/store/scanSessionStore";
import { useNetworkStore } from "../../src/store/networkStore";
import { getItemByBarcode, createCountLine, checkItemScanStatus } from "../../src/services/api/api";
import { RecentItemsService } from "../../src/services/enhancedFeatures";
import { toastService } from "../../src/services/utils/toastService";
import { CreateCountLinePayload } from "../../src/types/scan";

import ModernHeader from "../../src/components/ui/ModernHeader";
import ModernCard from "../../src/components/ui/ModernCard";
import ModernButton from "../../src/components/ui/ModernButton";
import ModernInput from "../../src/components/ui/ModernInput";
import { colors, spacing, typography, borderRadius, shadows } from "../../src/theme/modernDesign";

const CONDITION_OPTIONS = ["Good", "Aging", "Non-moving", "Rate Issue", "Scratches", "Damaged"];

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { currentFloor, currentRack } = useScanSessionStore();

  // State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [item, setItem] = useState<any>(null);

  // Form State
  const [quantity, setQuantity] = useState("1");
  const [mrp, setMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);
  const [condition, setCondition] = useState("Good");
  const [remark, setRemark] = useState("");

  // Damage State
  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [damageType, setDamageType] = useState<"returnable" | "nonreturnable">("returnable");

  useEffect(() => {
    loadItem();
  }, [barcode]);

  const loadItem = async () => {
    if (!barcode) return;
    setLoading(true);
    try {
      const itemData = await getItemByBarcode(barcode);
      if (itemData) {
        setItem(itemData);
        setMrp(String(itemData.mrp || ""));

        // Check for existing count
        try {
          const scanStatus = await checkItemScanStatus(sessionId!, itemData.item_code || barcode);
          if (scanStatus.scanned) {
            const existing = scanStatus.locations.find(
              (loc: any) => loc.floor_no === currentFloor && loc.rack_no === currentRack
            );
            if (existing) {
              setQuantity(String(existing.counted_qty));
              toastService.show("Loaded existing count", { type: "info" });
            }
          }
        } catch (e) {
          // Ignore
        }

        await RecentItemsService.addRecent(itemData.item_code || barcode, itemData);
      } else {
        Alert.alert("Error", "Item not found");
        router.back();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load item");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!item || !sessionId) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    if (isDamageEnabled) {
      const dQty = parseFloat(damageQty);
      if (isNaN(dQty) || dQty <= 0) {
        Alert.alert("Invalid Damage Quantity", "Please enter a valid damage quantity");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: CreateCountLinePayload = {
        session_id: sessionId,
        item_code: item.item_code || barcode,
        counted_qty: qty,
        floor_no: currentFloor || "Unknown",
        rack_no: currentRack || "Unknown",
        item_condition: condition,
        remark: remark,
        damage_included: isDamageEnabled,
        damaged_qty: isDamageEnabled && damageType === "returnable" ? parseFloat(damageQty) : 0,
        non_returnable_damaged_qty:
          isDamageEnabled && damageType === "nonreturnable" ? parseFloat(damageQty) : 0,
      };

      await createCountLine(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toastService.show("Item verified successfully", { type: "success" });
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save count");
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton Loader Component for enterprise loading state
  const SkeletonLoader = ({ style }: { style?: any }) => <View style={[styles.skeleton, style]} />;

  // Loading Skeleton Screen
  const LoadingSkeleton = () => (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ModernHeader title="Verify Item" showBackButton onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Item Card Skeleton */}
        <ModernCard style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <SkeletonLoader style={{ width: 48, height: 48, borderRadius: 24 }} />
            <View style={[styles.itemInfo, { marginLeft: spacing.md }]}>
              <SkeletonLoader style={{ width: "70%", height: 20, borderRadius: 6 }} />
              <SkeletonLoader style={{ width: "40%", height: 14, borderRadius: 4, marginTop: 8 }} />
            </View>
          </View>
          <View style={styles.detailsGrid}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.detailItem}>
                <SkeletonLoader style={{ width: 40, height: 12, borderRadius: 4 }} />
                <SkeletonLoader style={{ width: 50, height: 18, borderRadius: 4, marginTop: 4 }} />
              </View>
            ))}
          </View>
        </ModernCard>

        {/* Quantity Skeleton */}
        <ModernCard style={{ marginTop: spacing.lg, padding: spacing.lg }}>
          <SkeletonLoader style={{ width: 80, height: 14, borderRadius: 4 }} />
          <SkeletonLoader
            style={{ width: "100%", height: 72, borderRadius: 12, marginTop: spacing.md }}
          />
        </ModernCard>

        {/* Condition Skeleton */}
        <ModernCard style={{ marginTop: spacing.lg, padding: spacing.lg }}>
          <SkeletonLoader style={{ width: 80, height: 14, borderRadius: 4 }} />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} style={{ width: 80, height: 36, borderRadius: 18 }} />
            ))}
          </View>
        </ModernCard>
      </ScrollView>
    </SafeAreaView>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!item) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ModernHeader title="Verify Item" showBackButton onBackPress={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Item Header Card */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <ModernCard style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="cube" size={24} color={colors.primary[600]} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.item_name || item.name}</Text>
                  <Text style={styles.itemCode}>{item.item_code || barcode}</Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Stock</Text>
                  <Text style={styles.detailValue}>
                    {item.current_stock || item.stock_qty || 0}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>MRP</Text>
                  <Text style={styles.detailValue}>₹{item.mrp || 0}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>
                    ₹{item.sale_price || item.sales_price || 0}
                  </Text>
                </View>
              </View>
            </ModernCard>
          </Animated.View>

          {/* Quantity Input */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => {
                  const val = parseFloat(quantity) || 0;
                  if (val > 1) {
                    setQuantity(String(val - 1));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={28} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.qtyDisplay} activeOpacity={0.9}>
                <TextInput
                  style={styles.qtyText}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.qtyButton, { backgroundColor: colors.primary[600] }]}
                onPress={() => {
                  const val = parseFloat(quantity) || 0;
                  setQuantity(String(val + 1));
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* MRP Override */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MRP Override</Text>
              <Switch
                value={mrpEditable}
                onValueChange={setMrpEditable}
                trackColor={{
                  false: colors.gray[200],
                  true: colors.primary[600],
                }}
              />
            </View>
            {mrpEditable && (
              <ModernInput
                value={mrp}
                onChangeText={setMrp}
                keyboardType="numeric"
                placeholder="Enter new MRP"
                icon="pricetag"
              />
            )}
          </Animated.View>

          {/* Condition */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
            >
              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, condition === opt && styles.chipSelected]}
                  onPress={() => setCondition(opt)}
                >
                  <Text style={[styles.chipText, condition === opt && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Damage Toggle */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.error[600] }]}>Report Damage</Text>
              <Switch
                value={isDamageEnabled}
                onValueChange={setIsDamageEnabled}
                trackColor={{
                  false: colors.gray[200],
                  true: colors.error[600],
                }}
              />
            </View>

            {isDamageEnabled && (
              <View style={styles.damageContainer}>
                <ModernInput
                  value={damageQty}
                  onChangeText={setDamageQty}
                  keyboardType="numeric"
                  placeholder="Damaged Quantity"
                  label="Quantity"
                />

                <View style={styles.damageTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.damageTypeButton,
                      damageType === "returnable" && styles.damageTypeSelected,
                    ]}
                    onPress={() => setDamageType("returnable")}
                  >
                    <Text
                      style={[
                        styles.damageTypeText,
                        damageType === "returnable" && styles.damageTypeTextSelected,
                      ]}
                    >
                      Returnable
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.damageTypeButton,
                      damageType === "nonreturnable" && styles.damageTypeSelected,
                    ]}
                    onPress={() => setDamageType("nonreturnable")}
                  >
                    <Text
                      style={[
                        styles.damageTypeText,
                        damageType === "nonreturnable" && styles.damageTypeTextSelected,
                      ]}
                    >
                      Non-Returnable
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Remarks */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.section}>
            <ModernInput
              value={remark}
              onChangeText={setRemark}
              placeholder="Add remarks (optional)"
              label="Remarks"
              multiline
              numberOfLines={3}
            />
          </Animated.View>

          <View style={styles.footerSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <ModernButton
          title="Save & Verify"
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          icon="checkmark-circle"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.lg,
  },
  itemCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  itemCode: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  detailsGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  qtyButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[400],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  qtyDisplay: {
    minWidth: 100,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary[200],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  qtyText: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    textAlign: "center",
    minWidth: 60,
  },
  chipsScroll: {
    flexDirection: "row",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  chipTextSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.medium,
  },
  damageContainer: {
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[500],
  },
  damageTypeContainer: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  damageTypeButton: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[500],
    marginRight: spacing.sm,
  },
  damageTypeSelected: {
    backgroundColor: colors.error[600],
    borderColor: colors.error[600],
  },
  damageTypeText: {
    fontSize: typography.fontSize.sm,
    color: colors.error[600],
  },
  damageTypeTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  footerSpacer: {
    height: 80,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  // Skeleton Styles
  skeleton: {
    backgroundColor: colors.gray[200],
    overflow: "hidden",
  },
});
