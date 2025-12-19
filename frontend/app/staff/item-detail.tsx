import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
  LayoutAnimation,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "@/store/authStore";
import { useScanSessionStore } from "@/store/scanSessionStore";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "@/styles/modernDesignSystem";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { PremiumInput } from "@/components/premium/PremiumInput";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PhotoCaptureModal } from "@/components/modals/PhotoCaptureModal";

import {
  getItemByBarcode,
  refreshItemStock,
  createCountLine,
  addQuantityToCountLine,
  checkItemCounted,
  getVarianceReasons,
} from "@/services/api/api";
import { handleErrorWithRecovery } from "@/services/errorRecovery";
import { CreateCountLinePayload, VarianceReason } from "@/types/scan";
import { AnalyticsService } from "@/services/enhancedFeatures";
import { scanDeduplicationService } from "@/services/scanDeduplicationService";
import { RecentRacksService } from "@/services/recentRacksService";
import {
  getDefaultMrpForItem,
  getNormalizedMrpVariants,
  normalizeSerialValue,
} from "@/utils/scanUtils";
import { useItemState, usePhotoState } from "@/hooks/scan";

const CONDITION_OPTIONS = [
  "Good",
  "Aging",
  "Non-moving",
  "Rate Issue",
  "Scratches",
  "Damaged",
];

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { sessionType } = useScanSessionStore();

  // Local State
  const [loading, setLoading] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [mrp, setMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [categoryEditable, setCategoryEditable] = useState(false);

  // Auto-refresh timer ref
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const refreshErrorCountRef = useRef<number>(0);
  const MAX_REFRESH_ERRORS = 3; // Stop auto-refresh after 3 consecutive errors
  const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds (reduced frequency)

  // Enhanced Features
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [isSerialEnabled, setIsSerialEnabled] = useState(false);

  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [damageType, setDamageType] = useState<
    "returned" | "returnable" | "nonreturnable"
  >("returnable");
  const [damageRemark, setDamageRemark] = useState("");
  const [condition, setCondition] = useState("Good");

  const [mfgDate, setMfgDate] = useState("");
  const [remark, setRemark] = useState("");

  // Photos
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [itemPhoto, setItemPhoto] = useState<any>(null);

  const { resetItemState } = useItemState();

  // Load Item Details
  useEffect(() => {
    const loadItem = async () => {
      console.log("Loading Item Detail:", { barcode, sessionId });
      if (!barcode) {
        console.error("No barcode provided to ItemDetailScreen");
        return;
      }
      setLoading(true);
      try {
        console.log("Fetching item from API:", barcode);
        const itemData = await getItemByBarcode(barcode as string);
        if (itemData) {
          console.log("Item data received:", itemData);
          setItem(itemData);
          setMrp(
            itemData.mrp || itemData.standard_rate
              ? String(itemData.mrp || itemData.standard_rate)
              : "",
          );
          setCategory(itemData.category || "");
          setSubCategory(itemData.subcategory || "");
        } else {
          console.error("Item not found in API response");
          Alert.alert("Error", "Item not found");
          router.back();
        }
      } catch (error: any) {
        console.error("Error fetching item:", error);
        Alert.alert("Error", error.message || "Failed to load item");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (barcode) {
      loadItem();
    } else {
      console.log("Effect triggered but no barcode yet");
    }
  }, [barcode, router]);

  const handleRefreshStock = useCallback(
    async (silent: boolean = false) => {
      // Guard against undefined item_code to prevent crashes
      if (!item || !item.item_code) {
        if (!silent) {
          console.warn("handleRefreshStock called without valid item_code");
        }
        return;
      }

      // Skip if too many consecutive errors (for silent/auto-refresh only)
      if (silent && refreshErrorCountRef.current >= MAX_REFRESH_ERRORS) {
        console.log("Skipping auto-refresh: too many consecutive errors");
        return;
      }

      setRefreshingStock(true);
      try {
        const result = await refreshItemStock(item.item_code);
        if (result.success && result.item) {
          setItem(result.item);
          refreshErrorCountRef.current = 0; // Reset error count on success
          if (!silent && Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (!silent) {
            Alert.alert(
              "Success",
              result.message || "Stock refreshed successfully",
            );
          }
        } else if (!silent) {
          // Handle non-success response explicitly
          Alert.alert(
            "Refresh Issue",
            result.message || "Could not refresh stock data",
          );
        }
      } catch (error: any) {
        refreshErrorCountRef.current++;
        const errorMessage = error?.message || "Failed to refresh stock";
        if (!silent) {
          Alert.alert("Error", errorMessage);
        } else {
          console.log(
            `Silent refresh failed (${refreshErrorCountRef.current}/${MAX_REFRESH_ERRORS}): ${errorMessage}`,
          );
        }
      } finally {
        setRefreshingStock(false);
      }
    },
    [item],
  );

  // Auto-refresh stock every 30 seconds
  useEffect(() => {
    if (item?.item_code && sessionType !== "BLIND") {
      // Initial silent refresh
      handleRefreshStock(true);

      // Set up interval for auto-refresh
      refreshIntervalRef.current = setInterval(() => {
        handleRefreshStock(true);
      }, AUTO_REFRESH_INTERVAL);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
    return undefined;
  }, [item?.item_code, sessionType, handleRefreshStock]);

  // Adjust serial number inputs when quantity changes
  useEffect(() => {
    if (isSerialEnabled) {
      const qty = parseInt(quantity) || 0;
      setSerialNumbers((prev) => {
        if (prev.length === qty) return prev;
        if (prev.length < qty) {
          return [...prev, ...Array(qty - prev.length).fill("")];
        }
        return prev.slice(0, qty);
      });
    }
  }, [quantity, isSerialEnabled]);

  const clampQuantity = (val: number) => {
    if (Number.isNaN(val)) return 0;
    return Math.max(0, Math.floor(val));
  };

  const setQuantityFromNumber = (val: number) => {
    const clamped = clampQuantity(val);
    setQuantity(String(clamped));
  };

  const incrementQty = (step: number = 1) => {
    const current = parseInt(quantity || "0");
    const next = clampQuantity(current + step);
    setQuantity(String(next));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const decrementQty = (step: number = 1) => {
    const current = parseInt(quantity || "0");
    const next = clampQuantity(current - step);
    setQuantity(String(next));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSerialChange = (text: string, index: number) => {
    const newSerials = [...serialNumbers];
    newSerials[index] = text;
    setSerialNumbers(newSerials);
  };

  const addSerialField = () => {
    setSerialNumbers([...serialNumbers, ""]);
  };

  const validateForm = () => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid positive quantity");
      return false;
    }

    if (isSerialEnabled) {
      const validSerials = serialNumbers.filter((s) => s.trim().length > 0);
      if (validSerials.length !== Number(quantity)) {
        Alert.alert(
          "Missing Serials",
          `Please enter all ${quantity} serial numbers.`,
        );
        return false;
      }
    }

    if (isDamageEnabled) {
      const dQty = Number(damageQty);
      if (isNaN(dQty) || dQty < 0 || dQty > Number(quantity)) {
        Alert.alert(
          "Invalid Damage Qty",
          "Damage quantity cannot exceed total quantity.",
        );
        return false;
      }
    }

    if (sessionType === "STRICT" && item) {
      const currentStock = Number(item.current_stock || 0);
      const enteredQty = Number(quantity);
      if (enteredQty !== currentStock) {
        // In strict mode, we might want to prevent submission or just require confirmation
        // For now, let's just warn but allow if they confirm (which handleSubmit will effectively do via normal flow,
        // but let's add specific alert here if we wanted to BLOCK.
        // Requirement said "warning/alert appears", doesn't say "block".
        // Let's rely on a specific confirmation alert in handleSubmit for Strict mode variance.
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!item || !sessionId) return;

    // Strict Mode Variance Check
    if (sessionType === "STRICT") {
      const currentStock = Number(item.current_stock || 0);
      const enteredQty = Number(quantity);
      if (enteredQty !== currentStock) {
        const confirmed = await new Promise((resolve) => {
          Alert.alert(
            "Strict Mode Warning",
            `Counted quantity (${enteredQty}) does not match stock quantity (${currentStock}). Are you sure?`,
            [
              {
                text: "Cancel",
                onPress: () => resolve(false),
                style: "cancel",
              },
              {
                text: "Confirm Variance",
                onPress: () => resolve(true),
                style: "destructive",
              },
            ],
          );
        });
        if (!confirmed) return;
      }
    }

    setLoading(true);
    try {
      const payload: CreateCountLinePayload = {
        session_id: sessionId as string,
        item_code: item.item_code,
        counted_qty: Number(quantity),
        damaged_qty: isDamageEnabled ? Number(damageQty) : 0,
        item_condition: condition,
        remark: remark || undefined,
        photo_base64: itemPhoto?.base64,
        mrp_counted: mrpEditable && mrp ? Number(mrp) : undefined,
        category_correction: categoryEditable ? category : undefined,
        subcategory_correction: categoryEditable ? subCategory : undefined,
        manufacturing_date: mfgDate || undefined,
      };

      if (isSerialEnabled) {
        payload.serial_numbers = serialNumbers.map((sn, idx) => ({
          serial_number: normalizeSerialValue(sn),
          label: `Serial #${idx + 1}`,
          value: normalizeSerialValue(sn),
          condition: "good" as const,
        }));
      }

      await handleErrorWithRecovery(() => createCountLine(payload), {
        context: "Save Count",
        recovery: { maxRetries: 3 },
        showAlert: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Item counted successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);

      // Cleanup
      scanDeduplicationService.recordScan(item.item_code);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit count");
    } finally {
      setLoading(false);
    }
  };

  if (!item && loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Item Details...</Text>
      </View>
    );
  }

  if (!item) return null;

  return (
    <AuroraBackground variant="secondary" intensity="medium" animated={true}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={modernColors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Base Info Section */}
          <PremiumCard variant="glass" style={styles.infoCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.item_name}</Text>
              {item.barcode && (
                <View style={styles.barcodeBadge}>
                  <Ionicons name="barcode-outline" size={16} color={modernColors.text.secondary} />
                  <Text style={styles.itemBarcode}>{item.barcode}</Text>
                </View>
              )}
              {(item.category || item.subcategory) && (
                <Text style={styles.categoryText}>
                  {item.category}
                  {item.subcategory && ` / ${item.subcategory}`}
                </Text>
              )}
            </View>

            {/* Stock Qty Row with inline Refresh Button */}
            {sessionType !== "BLIND" && (
              <View style={styles.stockRow}>
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Stock Qty</Text>
                  <View style={styles.stockValueRow}>
                    <Text style={styles.stockValue}>
                      {item.current_stock || item.stock_qty || 0}
                    </Text>
                    <Text style={styles.stockUom}>
                      {item.uom_name || "N/A"}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.miniRefreshButton,
                        refreshingStock && styles.refreshButtonDisabled,
                      ]}
                      onPress={() => handleRefreshStock(false)}
                      disabled={refreshingStock}
                    >
                      {refreshingStock ? (
                        <ActivityIndicator
                          size="small"
                          color={modernColors.secondary[500]}
                        />
                      ) : (
                        <Ionicons
                          name="refresh"
                          size={16}
                          color={modernColors.secondary[500]}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Sale Price & MRP Row */}
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Sale Price</Text>
                <Text style={styles.priceValue}>
                  ₹{item.sales_price || item.standard_rate || "0.00"}
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>MRP</Text>
                <Text style={styles.priceValue}>₹{item.mrp || "0.00"}</Text>
              </View>
            </View>

            {sessionType === "BLIND" && (
              <View style={styles.blindModeIndicator}>
                <Ionicons
                  name="eye-off"
                  size={16}
                  color={modernColors.warning.main}
                />
                <Text style={styles.blindModeText}>BLIND MODE</Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              <Text style={styles.sectionTitle}>Edit Details</Text>
              <Switch
                value={categoryEditable}
                onValueChange={setCategoryEditable}
              />
            </View>

            {categoryEditable && (
              <>
                <PremiumInput
                  label="Category"
                  value={category}
                  onChangeText={setCategory}
                />
                <PremiumInput
                  label="Sub Category"
                  value={subCategory}
                  onChangeText={setSubCategory}
                />
              </>
            )}

            <View style={styles.toggleRow}>
              <Text style={styles.label}>MRP: {mrp}</Text>
              <Switch value={mrpEditable} onValueChange={setMrpEditable} />
            </View>
            {mrpEditable && (
              <PremiumInput
                label="New MRP"
                value={mrp}
                onChangeText={setMrp}
                keyboardType="numeric"
              />
            )}
          </PremiumCard>

          {/* Count Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Count Entry</Text>
            <View style={styles.countRow}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => decrementQty(1)}
                onLongPress={() => decrementQty(5)}
                delayLongPress={250}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Decrease quantity"
              >
                <Text style={styles.countButtonText}>−</Text>
              </TouchableOpacity>

              <View style={styles.countInputWrapper}>
                <PremiumInput
                  label="Physical Quantity"
                  value={quantity}
                  onChangeText={(t) => {
                    // allow only digits
                    const cleaned = t.replace(/[^0-9]/g, "");
                    setQuantity(cleaned);
                  }}
                  onBlur={() => setQuantityFromNumber(parseInt(quantity || "0"))}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  inputStyle={styles.mainInput}
                />
              </View>

              <TouchableOpacity
                style={styles.countButton}
                onPress={() => incrementQty(1)}
                onLongPress={() => incrementQty(5)}
                delayLongPress={250}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Increase quantity"
              >
                <Text style={styles.countButtonText}>＋</Text>
              </TouchableOpacity>
            </View>
            {sessionType !== "BLIND" && (
              <Text style={styles.varianceText}>
                Variance: {Number(quantity || 0) - Number(item?.current_stock || item?.stock_qty || 0)}
              </Text>
            )}
          </View>

          {/* Serial Numbers */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeader}>Serial Numbers (Unique)</Text>
              <Switch
                value={isSerialEnabled}
                onValueChange={setIsSerialEnabled}
              />
            </View>
            {isSerialEnabled &&
              serialNumbers.map((sn, index) => (
                <PremiumInput
                  key={index}
                  label={`Serial #${index + 1}`}
                  value={sn}
                  onChangeText={(text) => handleSerialChange(text, index)}
                  placeholder="Scan or enter SN"
                />
              ))}
            {isSerialEnabled && (
              <PremiumButton
                title="Add Field"
                onPress={addSerialField}
                variant="outline"
                size="small"
              />
            )}
          </View>

          {/* Manufacturing Date */}
          <View style={styles.section}>
            <PremiumInput
              label="Manufacturing Date (YYYY-MM-DD)"
              value={mfgDate}
              onChangeText={setMfgDate}
              placeholder="Optional"
            />
          </View>

          {/* Condition & Damage */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Condition & Remarks</Text>
            {/* Simplified condition selector - could be improved but keeping functional for now */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CONDITION_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCondition(c)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: condition === c ? modernColors.primary[500] : "rgba(255,255,255,0.1)",
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <PremiumInput
              label="Remarks"
              value={remark}
              onChangeText={setRemark}
              placeholder="Any observation..."
            />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Report Damage?</Text>
              <Switch
                value={isDamageEnabled}
                onValueChange={setIsDamageEnabled}
              />
            </View>

            {isDamageEnabled && (
              <View style={styles.damageBox}>
                <PremiumInput
                  label="Damaged Quantity"
                  value={damageQty}
                  onChangeText={setDamageQty}
                  keyboardType="numeric"
                />
                <PremiumInput
                  label="Remark / Type"
                  value={damageRemark}
                  onChangeText={setDamageRemark}
                  placeholder="Describe damage"
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <PremiumButton
              title={itemPhoto ? "Photo Added" : "Add Item Photo"}
              onPress={() => setShowPhotoModal(true)}
              variant="outline"
              icon="camera"
            />
          </View>

          <PremiumButton
            title="Submit Count"
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            size="large"
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoCaptureModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={setItemPhoto}
      />
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
  },
  loadingText: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: modernSpacing.lg,
    paddingBottom: modernSpacing.md,
    backgroundColor: modernColors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  backButton: {
    padding: modernSpacing.sm,
    marginRight: modernSpacing.md,
  },
  headerTitle: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  content: {
    padding: modernSpacing.lg,
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: modernSpacing.xl,
    padding: modernSpacing.md,
  },
  itemHeader: {
    marginBottom: modernSpacing.md,
  },
  itemName: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  itemBarcode: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: modernSpacing.sm,
  },
  categoryText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.sm,
  },
  stockRow: {
    marginBottom: modernSpacing.md,
  },
  stockItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
  },
  stockLabel: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  stockValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockValue: {
    ...modernTypography.h2,
    color: modernColors.secondary[500],
    marginRight: modernSpacing.sm,
  },
  stockUom: {
    ...modernTypography.body.medium,
    color: modernColors.secondary[500],
    marginRight: modernSpacing.sm,
  },
  miniRefreshButton: {
    padding: modernSpacing.xs,
    marginLeft: "auto",
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  priceRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.md,
  },
  priceItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    alignItems: "center",
  },
  priceLabel: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  priceValue: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  },
  blindModeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: modernBorderRadius.sm,
    padding: modernSpacing.sm,
    marginBottom: modernSpacing.md,
    gap: modernSpacing.xs,
  },
  blindModeText: {
    ...modernTypography.label.medium,
    color: modernColors.warning.main,
    fontWeight: "600",
  },
  itemCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: modernSpacing.md,
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
  },
  detailValue: {
    ...modernTypography.h4,
    color: modernColors.secondary[500],
  },
  section: {
    marginBottom: modernSpacing.xl,
  },
  sectionHeader: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: modernSpacing.md,
  },
  label: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  damageBox: {
    marginTop: modernSpacing.md,
    padding: modernSpacing.md,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: modernBorderRadius.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  mainInput: {
    fontSize: 28,
    textAlign: "center",
  },
  submitButton: {
    marginTop: modernSpacing.xl,
  },
  sectionTitle: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  },
  // Count controls layout
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: modernSpacing.md,
  },
  countButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: modernBorderRadius.lg,
    paddingVertical: modernSpacing.lg,
    paddingHorizontal: modernSpacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  countButtonText: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
  },
  countInputWrapper: {
    flex: 1,
  },
  varianceText: {
    marginTop: modernSpacing.sm,
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
});
