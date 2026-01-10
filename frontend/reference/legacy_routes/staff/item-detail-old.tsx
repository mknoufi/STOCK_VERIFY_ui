import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useScanSessionStore } from "@/store/scanSessionStore";
import { ScreenContainer } from "@/components/ui";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { PremiumInput } from "@/components/premium/PremiumInput";
import { PhotoCaptureModal } from "@/components/modals/PhotoCaptureModal";

import {
  getItemByBarcode,
  refreshItemStock,
  createCountLine,
} from "@/services/api/api";
import { RecentItemsService } from "@/services/enhancedFeatures";
import { handleErrorWithRecovery } from "@/services/errorRecovery";
import { CreateCountLinePayload } from "@/types/scan";
import { scanDeduplicationService } from "@/domains/inventory/services/scanDeduplicationService";
import {
  normalizeSerialValue,
} from "@/utils/scanUtils";
import { useItemState } from "@/domains/inventory/hooks/scan";
import { useNetworkStore } from "@/store/networkStore";
import { localDb } from "@/db/localDb";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";

const CONDITION_OPTIONS = [
  "Good",
  "Aging",
  "Non-moving",
  "Rate Issue",
  "Scratches",
  "Damaged",
];

const BLIND_SESSION_TYPE = "BLIND" as const;

import { useThemeContext } from "@/theme/ThemeContext";
import { modernColors } from "@/styles/modernDesignSystem";

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { sessionType } = useScanSessionStore();
  const { theme } = useThemeContext();
  const colors = theme.colors;

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
  const itemCodeRef = useRef<string | null>(null); // Track item_code for stable callback
  const MAX_REFRESH_ERRORS = 3; // Stop auto-refresh after 3 consecutive errors
  const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds (reduced frequency)

  // Enhanced Features
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);

  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [_damageType, _setDamageType] = useState<
    "returned" | "returnable" | "nonreturnable"
  >("returnable");
  const [damageRemark, setDamageRemark] = useState("");
  const [condition, setCondition] = useState("Good");
  
  // Toggle states for new UI
  const [enableMfgDate, setEnableMfgDate] = useState(false);
  const [enableExpiryDate, setEnableExpiryDate] = useState(false);
  const [enableSerial, setEnableSerial] = useState(false);

  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [remark, setRemark] = useState("");
  const [nonReturnableDamageQty, setNonReturnableDamageQty] = useState("");

  // Photos
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [itemPhoto, setItemPhoto] = useState<any>(null);

  const { resetItemState: _resetItemState } = useItemState();

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
        const { isOnline } = useNetworkStore.getState();
        let itemData;

        if (isOnline) {
          console.log("Fetching item from API:", barcode);
          itemData = await getItemByBarcode(barcode as string);
        } else {
          console.log("Offline: Fetching item from cache:", barcode);
          // getItemByBarcode has offline cache support built in
          itemData = await getItemByBarcode(barcode as string);
        }

        if (itemData) {
          console.log("=== ITEM DATA RECEIVED ===");
          console.log("Full itemData:", JSON.stringify(itemData, null, 2));
          console.log("item_name:", itemData.item_name);
          console.log("barcode:", itemData.barcode);
          console.log("sales_price:", itemData.sales_price);
          console.log("mrp:", itemData.mrp);
          console.log("current_stock:", itemData.current_stock);
          console.log("stock_qty:", itemData.stock_qty);
          setItem(itemData);

          // Add to recent scans
          try {
            const itemCode = (itemData?.item_code || itemData?.barcode || barcode) as string;
            await RecentItemsService.addRecent(itemCode, itemData);
          } catch (e) {
            console.warn("Failed to add to recent items", e);
          }

          setMrp(
            itemData.mrp
              ? String(itemData.mrp)
              : "",
          );
          setCategory(itemData.category || "");
          setSubCategory(itemData.subcategory || "");
          // Location is handled by session store, we can still show it in logs but user requested and approved removal of manual entry and redundant badges
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
  }, [barcode, router, setLoading, setItem, setMrp, setCategory, setSubCategory, sessionId]);

  // Keep itemCodeRef in sync with item.item_code
  useEffect(() => {
    itemCodeRef.current = item?.item_code ?? null;
  }, [item?.item_code]);

  const handleRefreshStock = useCallback(
    async (silent: boolean = false) => {
      // Use ref for stable item_code reference
      const currentItemCode = itemCodeRef.current;

      // Guard against undefined item_code to prevent crashes
      if (!currentItemCode) {
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
        const result = await refreshItemStock(currentItemCode);
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
    [], // Stable function - uses refs internally
  );

  // Auto-refresh stock every 30 seconds
  // Note: We intentionally exclude handleRefreshStock from deps to prevent infinite loop
  // The interval is re-created only when item_code or sessionType changes
  useEffect(() => {
    if (item?.item_code && sessionType !== "BLIND") {
      // Initial silent refresh (delayed to avoid race with initial load)
      const initialRefreshTimeout = setTimeout(() => {
        handleRefreshStock(true);
      }, 1000);

      // Set up interval for auto-refresh
      refreshIntervalRef.current = setInterval(() => {
        handleRefreshStock(true);
      }, AUTO_REFRESH_INTERVAL);

      return () => {
        clearTimeout(initialRefreshTimeout);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.item_code, sessionType]); // Exclude handleRefreshStock to prevent infinite loop

  // Adjust serial number inputs when quantity changes
  useEffect(() => {
    const validSerials = serialNumbers.filter(sn => sn && sn.trim().length > 0);
    if (validSerials.length > 0) {
      const qty = parseInt(quantity) || 0;
      setSerialNumbers((prev) => {
        if (prev.length === qty) return prev;
        if (prev.length < qty) {
          return [...prev, ...Array(qty - prev.length).fill("")];
        }
        return prev.slice(0, qty);
      });
    }
  }, [quantity, serialNumbers]);

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

    // Flexible date validation - just check if they LOOK like dates if provided, but allow Year only
    const yearRegex = /^\d{4}$/;
    const yearMonthRegex = /^\d{4}-\d{2}$/;
    const fullDateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (mfgDate && !yearRegex.test(mfgDate) && !yearMonthRegex.test(mfgDate) && !fullDateRegex.test(mfgDate)) {
      Alert.alert("Format Issue", "Mfg Date should be YYYY, YYYY-MM, or YYYY-MM-DD");
      return false;
    }

    if (expiryDate && !yearRegex.test(expiryDate) && !yearMonthRegex.test(expiryDate) && !fullDateRegex.test(expiryDate)) {
      Alert.alert("Format Issue", "Expiry Date should be YYYY, YYYY-MM, or YYYY-MM-DD");
      return false;
    }

    const validSerials = serialNumbers.filter((s) => s.trim().length > 0);
    if (validSerials.length > 0) {
      if (validSerials.length !== Number(quantity)) {
        Alert.alert(
          "Serial Mismatch",
          `You have entered ${validSerials.length} serials but quantity is ${quantity}. They must match if serials are provided.`,
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
        batch_id: item.batch_id,
        counted_qty: Number(quantity),
        damaged_qty: isDamageEnabled ? Number(damageQty) : 0,
        item_condition: condition,
        remark: remark || undefined,
        photo_base64: itemPhoto?.base64,
        mrp_counted: mrpEditable && mrp ? Number(mrp) : undefined,
        category_correction: categoryEditable ? category : undefined,
        subcategory_correction: categoryEditable ? subCategory : undefined,
        manufacturing_date: mfgDate || undefined,
        expiry_date: expiryDate || undefined,
        floor_no: useScanSessionStore.getState().currentFloor || undefined,
        rack_no: useScanSessionStore.getState().currentRack || undefined,
        non_returnable_damaged_qty: isDamageEnabled ? Number(nonReturnableDamageQty) : 0,
      };

      const validSerials = serialNumbers.filter(sn => sn && sn.trim().length > 0);
      if (validSerials.length > 0) {
        payload.serial_numbers = validSerials.map((sn, idx) => ({
          serial_number: normalizeSerialValue(sn),
          label: `Serial #${idx + 1}`,
          value: normalizeSerialValue(sn),
          condition: "good" as const,
        }));
      }

      const { isOnline } = useNetworkStore.getState();

      if (isOnline) {
        await handleErrorWithRecovery(() => createCountLine(payload), {
          context: "Save Count",
          recovery: { maxRetries: 3 },
          showAlert: true,
        });
      } else {
        console.log("Offline: Saving to local DB queue...");
        await localDb.savePendingVerification(payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isOnline ? "Success" : "Offline Success",
        isOnline
          ? "Item counted successfully"
          : "Item saved locally. It will sync when you are back online.",
        [{ text: "OK", onPress: () => router.back() }],
      );

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
    <ScreenContainer
      header={{
        title: "Item Details",
        showBackButton: true,
        showUsername: false,
        showLogoutButton: true,
      }}
      backgroundType="aurora"
      auroraVariant="primary"
      auroraIntensity="medium"
      contentMode="static"
      noPadding
      statusBarStyle="light"
      overlay={<OfflineIndicator />}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.verifyCard}>
            <View style={styles.verifyHeader}>
              <Text style={styles.verifyTitle}>Verify Item</Text>
            </View>
            <View style={styles.verifyContent}>
              {/* Item Info */}
              <Text style={styles.itemNameBlue}>{item.item_name}</Text>
              <Text style={styles.itemMetaText}>
                Category: {item.category || "N/A"}
              </Text>
              {sessionType !== BLIND_SESSION_TYPE && (
                <Text style={styles.itemMetaText}>
                  Stock: {item.current_stock || item.stock_qty || 0}{" "}
                  {item.uom_name || ""}
                </Text>
              )}
              <View style={styles.itemPriceRow}>
                <Text style={styles.itemMetaText}>MRP: ₹{item.mrp || 0}</Text>
                <Text style={styles.itemMetaText}>
                  Price: ₹{item.sales_price || 0}
                </Text>
              </View>

              {/* Barcode Display */}
              <View style={styles.barcodeDisplay}>
                <Text style={styles.barcodeText}>{item.barcode}</Text>
              </View>

              {/* Quantity Segment */}
              <View style={styles.qtySegment}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => decrementQty(1)}
                  onLongPress={() => decrementQty(5)}
                  delayLongPress={250}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </TouchableOpacity>

                <View style={styles.qtyInputContainer}>
                  <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, "");
                      setQuantity(cleaned);
                    }}
                    onBlur={() => setQuantityFromNumber(parseInt(quantity || "0"))}
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  />
                </View>

                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => incrementQty(1)}
                  onLongPress={() => incrementQty(5)}
                  delayLongPress={250}
                >
                  <Text style={styles.qtyButtonText}>＋</Text>
                </TouchableOpacity>
              </View>

              {/* Attributes Section */}
              <View style={styles.attributeBox}>
                <Text style={styles.attributeTitle}>Attributes</Text>

                <View style={styles.toggleItem}>
                  <Text style={styles.toggleLabel}>Manufacturing Date</Text>
                  <Switch
                    value={enableMfgDate}
                    onValueChange={setEnableMfgDate}
                    trackColor={{ false: "#E2E8F0", true: "#1976D2" }}
                    thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  />
                </View>
                {enableMfgDate && (
                  <PremiumInput
                    value={mfgDate}
                    onChangeText={setMfgDate}
                    placeholder="YYYY or YYYY-MM"
                  />
                )}

                <View style={styles.toggleItem}>
                  <Text style={styles.toggleLabel}>Expiry Date</Text>
                  <Switch
                    value={enableExpiryDate}
                    onValueChange={setEnableExpiryDate}
                    trackColor={{ false: "#E2E8F0", true: "#1976D2" }}
                    thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  />
                </View>
                {enableExpiryDate && (
                  <PremiumInput
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="YYYY or YYYY-MM"
                  />
                )}

                <View style={styles.toggleItem}>
                  <Text style={styles.toggleLabel}>Serialized Item</Text>
                  <Switch
                    value={enableSerial}
                    onValueChange={setEnableSerial}
                    trackColor={{ false: "#E2E8F0", true: "#1976D2" }}
                    thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  />
                </View>
                {enableSerial && (
                  <View style={{ marginTop: 8 }}>
                    {serialNumbers.map((sn, index) => (
                      <PremiumInput
                        key={index}
                        label={`Serial #${index + 1}`}
                        value={sn}
                        onChangeText={(text) => handleSerialChange(text, index)}
                        placeholder="Scan or enter SN"
                      />
                    ))}
                    <PremiumButton
                      title="Add Serial Number"
                      onPress={addSerialField}
                      variant="outline"
                      size="small"
                    />
                  </View>
                )}
              </View>

              {/* Condition */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.toggleLabel, { marginBottom: 8 }]}>Condition</Text>
                <View style={styles.conditionSegmentContainer}>
                  {["New", "Good", "Damaged"].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.conditionOption,
                        condition === c && styles.conditionOptionActive,
                      ]}
                      onPress={() => setCondition(c)}
                    >
                      <Text
                        style={[
                          styles.conditionText,
                          condition === c && styles.conditionTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButtonBlue}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save & Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoCaptureModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={setItemPhoto}
      />
    </ScreenContainer >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  verifyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  verifyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  verifyContent: {
    padding: 16,
  },
  itemNameBlue: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.primary[500], // Lavanya Blue
    marginBottom: 4,
    textAlign: "center",
  },
  itemMetaText: {
    fontSize: 13,
    color: modernColors.neutral[500],
    textAlign: "center",
    marginBottom: 2,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  barcodeDisplay: {
    backgroundColor: modernColors.neutral[100],
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.neutral[700],
    letterSpacing: 1,
  },
  qtySegment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 16,
  },
  qtyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: modernColors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: modernColors.primary[200],
  },
  qtyButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: modernColors.primary[600],
    marginTop: -2,
  },
  qtyInputContainer: {
    width: 100,
    height: 48,
    borderWidth: 1,
    borderColor: modernColors.neutral[200],
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  qtyInput: {
    fontSize: 20,
    fontWeight: "700",
    color: modernColors.neutral[900],
    textAlign: "center",
  },
  attributeBox: {
    borderTopWidth: 1,
    borderTopColor: modernColors.neutral[200],
    paddingTop: 16,
  },
  attributeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: modernColors.neutral[900],
    marginBottom: 12,
  },
  toggleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: modernColors.neutral[700],
    fontWeight: "500",
  },
  conditionSegmentContainer: {
    flexDirection: "row",
    backgroundColor: modernColors.neutral[100],
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  conditionOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  conditionOptionActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: "600",
    color: modernColors.neutral[500],
  },
  conditionTextActive: {
    color: modernColors.primary[700],
  },
  saveButtonBlue: {
    backgroundColor: modernColors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // Keep required legacy styles if needed, but mostly replaced
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
  },
  submitButton: {
    // Legacy support if component uses it
    marginTop: 20,
  }
});
