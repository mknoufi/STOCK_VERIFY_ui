/**
 * Staff Item Detail Screen - Refactored with Shared Components
 * Uses unified ItemDetailCard, QuantityInput, ItemAttributesSection, ItemActionsFooter
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useScanSessionStore } from "@/store/scanSessionStore";
import { ScreenContainer, GlassCard } from "@/components/ui";
import { PhotoCaptureModal } from "@/components/modals/PhotoCaptureModal";
import { PremiumButton } from "@/components/premium/PremiumButton";

import {
  ItemDetailCard,
  QuantityInput,
  ItemAttributesSection,
  ItemActionsFooter,
  ItemStatsRow,
  ItemPhotoGallery,
  ItemNotesSection,
  ItemShareSheet,
  ItemQuickActions,
  createVarianceStats,
  createItemQuickActions,
  type AttributeToggleState,
  type AttributeValues,
  type PhotoItem,
  type Note,
} from "@/components/items";

import {
  getItemByBarcode,
  refreshItemStock,
  createCountLine,
} from "@/services/api/api";
import { RecentItemsService } from "@/services/enhancedFeatures";
import { handleErrorWithRecovery } from "@/services/errorRecovery";
import { CreateCountLinePayload } from "@/types/scan";
import { scanDeduplicationService } from "@/domains/inventory/services/scanDeduplicationService";
import { normalizeSerialValue } from "@/utils/scanUtils";
import { useNetworkStore } from "@/store/networkStore";
import { useAuthStore } from "@/store/authStore";
import { localDb } from "@/db/localDb";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { BarcodeScanner } from "@/components/scan/BarcodeScanner";

import { useThemeContext } from "@/theme/ThemeContext";
import { theme } from "@/styles/modernDesignSystem";

const BLIND_SESSION_TYPE = "BLIND" as const;
const AUTO_REFRESH_INTERVAL = 60000;
const MAX_REFRESH_ERRORS = 3;

/**
 * Get the color for stock difference indicator based on difference value
 */
const getDifferenceColor = (stockDifference: number | null): string => {
  if (stockDifference === null) return theme.colors.muted;
  if (stockDifference === 0) return theme.colors.success.main;
  if (Math.abs(stockDifference) <= 5) return theme.colors.warning.main;
  return theme.colors.danger;
};

/**
 * Format stock difference with + prefix for positive values
 */
const formatDifferenceSign = (value: number): string => {
  return value >= 0 ? '+' : '';
};

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { sessionType } = useScanSessionStore();
  const { user } = useAuthStore();
  const { theme: _appTheme } = useThemeContext();

  // ========================================================================
  // State
  // ========================================================================
  const [loading, setLoading] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [erpStockInfo, setErpStockInfo] = useState<{
    erpConnected: boolean;
    erpStockQty: number | null;
    mongoStockQty: number | null;
    stockDifference: number | null;
  } | null>(null);

  // Editable fields
  const [mrp, setMrp] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const mrpEditable = false;
  const categoryEditable = false;

  // Attribute toggles
  const [attributeToggles, setAttributeToggles] = useState<AttributeToggleState>({
    mfgDate: false,
    expiryDate: false,
    serialNumbers: false,
    damage: false,
  });

  // Attribute values
  const [attributeValues, setAttributeValues] = useState<AttributeValues>({
    mfgDate: "",
    expiryDate: "",
    serialNumbers: [],
    condition: "Good",
    damageQty: 0,
    damageRemark: "",
    nonReturnableDamageQty: 0,
    remark: "",
  });

  // Photo state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [itemPhoto, setItemPhoto] = useState<any>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);

  // Batch State
  interface BatchItem {
    id: string;
    quantity: number;
    attributes: AttributeValues;
    attributeToggles: AttributeToggleState;
  }
  const [batches, setBatches] = useState<BatchItem[]>([]);

  // Serial Scanner State
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [activeSerialIndex, setActiveSerialIndex] = useState<number>(-1);

  // Share sheet state
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Auto-refresh refs
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshErrorCountRef = useRef<number>(0);
  const itemCodeRef = useRef<string | null>(null);

  // ========================================================================
  // Data Loading
  // ========================================================================
  useEffect(() => {
    const loadItem = async () => {
      if (!barcode) return;
      
      setLoading(true);
      try {
        const { isOnline: _isOnline } = useNetworkStore.getState();
        const itemData = await getItemByBarcode(barcode);

        if (itemData) {
          setItem(itemData);
          setMrp(itemData.mrp ? String(itemData.mrp) : "");
          setCategory(itemData.category || "");
          setSubCategory(itemData.subcategory || "");

          // Add to recent scans
          try {
            const itemCode = itemData?.item_code || itemData?.barcode || barcode;
            await RecentItemsService.addRecent(itemCode, itemData);
          } catch (e) {
            console.warn("Failed to add to recent items", e);
          }
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

    if (barcode) {
      loadItem();
    }
  }, [barcode, router, sessionId]);

  // Keep itemCodeRef in sync
  useEffect(() => {
    itemCodeRef.current = item?.item_code ?? null;
  }, [item?.item_code]);

  // ========================================================================
  // Stock Refresh Helpers
  // ========================================================================
  const showRefreshSuccessAlert = useCallback((result: { 
    stock_difference?: number | null; 
    message?: string 
  }) => {
    const diffMsg = result.stock_difference !== null && result.stock_difference !== undefined
      ? ` (ERP diff: ${formatDifferenceSign(result.stock_difference)}${result.stock_difference})`
      : '';
    const baseMsg = typeof result.message === 'string' ? result.message : "Stock refreshed successfully";
    Alert.alert("Success", baseMsg + diffMsg);
  }, []);

  const handleRefreshSuccess = useCallback((result: any, silent: boolean) => {
    setItem(result.item);
    setErpStockInfo({
      erpConnected: result.erp_connected ?? false,
      erpStockQty: result.erp_stock_qty ?? null,
      mongoStockQty: result.mongo_stock_qty ?? null,
      stockDifference: result.stock_difference ?? null,
    });
    refreshErrorCountRef.current = 0;
    
    if (!silent && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!silent) {
      showRefreshSuccessAlert(result);
    }
  }, [showRefreshSuccessAlert]);

  const handleRefreshError = useCallback((error: any, silent: boolean) => {
    refreshErrorCountRef.current++;
    setErpStockInfo(null);
    if (!silent) {
      const errMsg = typeof error?.message === 'string' ? error.message : "Failed to refresh stock";
      Alert.alert("Error", errMsg);
    }
  }, []);

  // ========================================================================
  // Stock Refresh
  // ========================================================================
  const handleRefreshStock = useCallback(async (silent: boolean = false) => {
    const currentItemCode = itemCodeRef.current;
    if (!currentItemCode) return;
    if (silent && refreshErrorCountRef.current >= MAX_REFRESH_ERRORS) return;

    setRefreshingStock(true);
    try {
      const result = await refreshItemStock(currentItemCode);
      if (result.success && result.item) {
        handleRefreshSuccess(result, silent);
      }
    } catch (error: any) {
      handleRefreshError(error, silent);
    } finally {
      setRefreshingStock(false);
    }
  }, [handleRefreshSuccess, handleRefreshError]);

  // Auto-refresh interval
  useEffect(() => {
    if (item?.item_code && sessionType !== "BLIND") {
      const initialRefreshTimeout = setTimeout(() => {
        handleRefreshStock(true);
      }, 1000);

      refreshIntervalRef.current = setInterval(() => {
        handleRefreshStock(true);
      }, AUTO_REFRESH_INTERVAL);

      return () => {
        clearTimeout(initialRefreshTimeout);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
    return undefined;
  }, [item?.item_code, sessionType, handleRefreshStock]);

  // ========================================================================
  // Attribute Handlers
  // ========================================================================
  const handleToggleChange = (key: keyof AttributeToggleState, value: boolean) => {
    setAttributeToggles((prev) => ({ ...prev, [key]: value }));
    
    if (key === "serialNumbers" && value && (!attributeValues.serialNumbers || attributeValues.serialNumbers.length === 0)) {
      setAttributeValues((prev) => ({
        ...prev,
        serialNumbers: new Array(quantity).fill(""),
      }));
    }
  };

  const handleValueChange = (key: keyof AttributeValues, value: any) => {
    setAttributeValues((prev) => ({ ...prev, [key]: value }));
  };

  // Sync serial number array with quantity
  useEffect(() => {
    if (attributeToggles.serialNumbers) {
      const currentSerials = attributeValues.serialNumbers || [];
      if (currentSerials.length !== quantity) {
        const newSerials = new Array(quantity)
          .fill("")
          .map((_, i) => currentSerials[i] || "");
        setAttributeValues((prev) => ({ ...prev, serialNumbers: newSerials }));
      }
    }
  }, [quantity, attributeToggles.serialNumbers, attributeValues.serialNumbers]);

  // ========================================================================
  // Serial Scanning
  // ========================================================================
  const handleScanSerial = (index: number) => {
    setActiveSerialIndex(index);
    setShowSerialScanner(true);
  };

  const handleSerialScanned = (data: { data: string }) => {
    if (activeSerialIndex >= 0) {
      const currentSerials = attributeValues.serialNumbers || [];
      const newSerials = [...currentSerials];
      newSerials[activeSerialIndex] = normalizeSerialValue(data.data);
      setAttributeValues((prev) => ({ ...prev, serialNumbers: newSerials }));
      setShowSerialScanner(false);
      
      // Auto-advance to next serial logic usage could be added here
      if (activeSerialIndex < quantity - 1) {
         // Optional: Auto open next? For now let's just close to let user confirm.
         // setActiveSerialIndex(activeSerialIndex + 1);
      }
    }
  };

  // ========================================================================
  // Batch Management
  // ========================================================================
  const handleAddBatch = () => {
    if (!validateForm()) return;
    
    // Create new batch object
    const newBatch: BatchItem = {
      id: Date.now().toString(),
      quantity: quantity,
      attributes: { ...attributeValues },
      attributeToggles: { ...attributeToggles },
    };
    
    setBatches((prev) => [...prev, newBatch]);
    
    // Reset form for next batch
    setQuantity(1);
    setAttributeValues({
      mfgDate: attributeValues.mfgDate, // Keep dates potentially
      expiryDate: attributeValues.expiryDate, // Keep dates potentially
      serialNumbers: [],
      condition: "Good",
      damageQty: 0,
      damageRemark: "",
      nonReturnableDamageQty: 0,
      remark: "",
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Batch Added", "Now enter details for the next batch.");
  };

  const handleRemoveBatch = (batchId: string) => {
    setBatches((prev) => prev.filter(b => b.id !== batchId));
  };

  // ========================================================================
  // Validation & Submit
  // ========================================================================
  const validateForm = (): boolean => {
    if (quantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid positive quantity");
      return false;
    }

    // Date format validation
    const dateRegex = /^(\d{4}|\d{4}-\d{2}|\d{4}-\d{2}-\d{2})$/;
    if (attributeToggles.mfgDate && attributeValues.mfgDate && !dateRegex.test(attributeValues.mfgDate)) {
      Alert.alert("Format Issue", "Mfg Date should be YYYY, YYYY-MM, or YYYY-MM-DD");
      return false;
    }
    if (attributeToggles.expiryDate && attributeValues.expiryDate && !dateRegex.test(attributeValues.expiryDate)) {
      Alert.alert("Format Issue", "Expiry Date should be YYYY, YYYY-MM, or YYYY-MM-DD");
      return false;
    }

    // Serial number validation
    if (attributeToggles.serialNumbers) {
      const validSerials = (attributeValues.serialNumbers || []).filter((s) => s.trim().length > 0);
      if (validSerials.length > 0 && validSerials.length !== quantity) {
        Alert.alert(
          "Serial Mismatch",
          `You have entered ${validSerials.length} serials but quantity is ${quantity}. They must match.`
        );
        return false;
      }
    }

    // Damage qty validation
    if (attributeToggles.damage) {
      const damageQty = attributeValues.damageQty || 0;
      if (damageQty > quantity) {
        Alert.alert("Invalid Damage Qty", "Damage quantity cannot exceed total quantity.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    // If we have batches, the current form is "the last batch" if user didn't explicitly add it.
    // Or we force user to add it?
    // Let's treat current form as "Another batch" if quantity > 0 and user hits Save.
    
    if (!validateForm()) return;
    if (!item || !sessionId) return;

    // Strict Mode Variance Check (only checks total vs stock??)
    // Detailed strict mode implementation is complex with batches. 
    // For now, let's warn based on total counted so far (batches + current).
    
    const totalCounted = batches.reduce((sum, b) => sum + b.quantity, 0) + quantity;
    if (sessionType === "STRICT") {
      const currentStock = Number(item.current_stock || 0);
      if (totalCounted !== currentStock) {
        // ... (existing warning logic)
         const confirmed = await new Promise((resolve) => {
          Alert.alert(
            "Strict Mode Warning",
            `Total counted quantity (${totalCounted}) does not match stock quantity (${currentStock}). Are you sure?`,
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              { text: "Confirm Variance", onPress: () => resolve(true), style: "destructive" },
            ]
          );
        });
        if (!confirmed) return;
      }
    }

    setLoading(true);
    try {
      // Helper to submit a single batch
      const submitBatch = async (batchQty: number, batchAttrs: AttributeValues, batchToggles: AttributeToggleState) => {
        const payload: CreateCountLinePayload = {
            session_id: sessionId,
            item_code: item.item_code,
            batch_id: item.batch_id, // Note: backend needs to support creating NEW batches if serials imply it?
            counted_qty: batchQty,
            damaged_qty: batchToggles.damage ? (batchAttrs.damageQty || 0) : 0,
            item_condition: batchAttrs.condition || "Good",
            remark: batchAttrs.remark || undefined,
            photo_base64: itemPhoto?.base64,
            mrp_counted: mrpEditable && mrp ? Number(mrp) : undefined,
            category_correction: categoryEditable ? category : undefined,
            subcategory_correction: categoryEditable ? subCategory : undefined,
            manufacturing_date: batchToggles.mfgDate ? batchAttrs.mfgDate : undefined,
            expiry_date: batchToggles.expiryDate ? batchAttrs.expiryDate : undefined,
            floor_no: useScanSessionStore.getState().currentFloor || undefined,
            rack_no: useScanSessionStore.getState().currentRack || undefined,
            non_returnable_damaged_qty: batchToggles.damage ? (batchAttrs.nonReturnableDamageQty || 0) : 0,
        };

        // Add serial numbers if enabled
        if (batchToggles.serialNumbers) {
            const validSerials = (batchAttrs.serialNumbers || []).filter((sn) => sn.trim().length > 0);
            if (validSerials.length > 0) {
              payload.serial_numbers = validSerials.map((sn, idx) => ({
                serial_number: normalizeSerialValue(sn),
                label: `Serial #${idx + 1}`,
                value: normalizeSerialValue(sn),
                condition: "good" as const,
              }));
            }
        }

        const { isOnline } = useNetworkStore.getState();
        if (isOnline) {
             await handleErrorWithRecovery(() => createCountLine(payload), {
              context: "Save Count",
              recovery: { maxRetries: 3 },
              showAlert: false, // We handle alert at end
            });
        } else {
             await localDb.savePendingVerification(payload);
        }
      };

      // 1. Submit stored batches
      for (const batch of batches) {
        await submitBatch(batch.quantity, batch.attributes, batch.attributeToggles);
      }

      // 2. Submit current form
      await submitBatch(quantity, attributeValues, attributeToggles);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const { isOnline } = useNetworkStore.getState();
      Alert.alert(
        isOnline ? "Success" : "Offline Success",
        isOnline
          ? `Item verified successfully (${batches.length + 1} batches)`
          : "Item saved locally. It will sync when you are back online.",
        [{ text: "OK", onPress: () => router.back() }]
      );

      scanDeduplicationService.recordScan(item.item_code);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit count");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // Render
  // ========================================================================
  if (!item && loading) {
    return (
      <ScreenContainer
        header={{ title: "Item Details", showBackButton: true }}
        backgroundType="aurora"
        loading={true}
        loadingText="Loading Item..."
      />
    );
  }

  if (!item) return null;

  const isBlindMode = sessionType === BLIND_SESSION_TYPE;
  const currentStock = item.current_stock || item.stock_qty || 0;

  return (
    <ScreenContainer
      header={{
        title: "Verify Item",
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Item Card */}
          <ItemDetailCard
            item={item}
            variant="full"
            showStock={!isBlindMode}
            showPrices={true}
            showLocation={true}
            showVerificationStatus={true}
            showRefreshButton={!isBlindMode}
            refreshingStock={refreshingStock}
            onRefreshStock={() => handleRefreshStock(false)}
            animationDelay={100}
          />

          {/* ERP Stock Comparison (real-time from SQL Server) */}
          {!isBlindMode && erpStockInfo && erpStockInfo.erpConnected && erpStockInfo.stockDifference !== null && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <GlassCard
                intensity={15}
                padding={theme.spacing.sm}
                borderRadius={theme.borderRadius.md}
                style={{
                  marginBottom: theme.spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: getDifferenceColor(erpStockInfo.stockDifference),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: 2 }}>
                      ERP Real-time Stock
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}>
                      {erpStockInfo.erpStockQty ?? '-'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: 2 }}>
                      Difference
                    </Text>
                    <Text style={{ 
                      fontSize: 18, 
                      fontWeight: '700', 
                      color: getDifferenceColor(erpStockInfo.stockDifference),
                    }}>
                      {erpStockInfo.stockDifference >= 0 ? '+' : ''}{erpStockInfo.stockDifference}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: 2 }}>
                      Cached Stock
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.secondary }}>
                      {erpStockInfo.mongoStockQty ?? '-'}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Variance Stats (for non-blind mode) */}
          {!isBlindMode && (
             <ItemStatsRow
              stats={createVarianceStats(currentStock, batches.reduce((sum, b) => sum + b.quantity, 0) + quantity, batches.reduce((sum, b) => sum + b.quantity, 0) + quantity - currentStock)}
              animationDelay={200}
            />
          )}

          {/* Added Batches List */}
          {batches.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <GlassCard
                intensity={15}
                padding={theme.spacing.md}
                borderRadius={theme.borderRadius.lg}
                style={{marginBottom: theme.spacing.md}}
              >
                 <Text style={styles.sectionTitle}>Batches Added ({batches.length})</Text>
                 {batches.map((batch, index) => (
                    <View key={batch.id} style={{
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingVertical: 8,
                        borderBottomWidth: index < batches.length - 1 ? 1 : 0,
                        borderBottomColor: 'rgba(255,255,255,0.1)'
                    }}>
                        <View>
                            <Text style={{color: theme.colors.text.primary, fontWeight: '600'}}>Batch #{index + 1}</Text>
                            <Text style={{color: theme.colors.text.secondary, fontSize: 12}}>Qty: {batch.quantity}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveBatch(batch.id)}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error.main} />
                        </TouchableOpacity>
                    </View>
                 ))}
              </GlassCard>
            </Animated.View>
          )}

          {/* Quantity Input */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <GlassCard
              intensity={15}
              padding={theme.spacing.md}
              borderRadius={theme.borderRadius.lg}
              style={styles.quantityCard}
            >
              <Text style={styles.sectionTitle}>{batches.length > 0 ? "Next Batch Quantity" : "Count Quantity"}</Text>
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={0}
                showUOM={true}
                uomName={item.uom_name}
                size="large"
              />
            </GlassCard>
          </Animated.View>

          {/* Attributes Section */}
          <ItemAttributesSection
            toggles={attributeToggles}
            values={attributeValues}
            onToggleChange={handleToggleChange}
            onValueChange={handleValueChange}
            quantity={quantity}
            showConditionPicker={true}
            conditionOptions={["New", "Good", "Damaged"]}
            onScanSerial={handleScanSerial}
            animationDelay={400}
          />
          
          <Animated.View entering={FadeInDown.delay(450).springify()} style={{ marginBottom: theme.spacing.md }}>
             <PremiumButton
                title="Add Another Batch"
                onPress={handleAddBatch}
                variant="secondary"
                icon="add-circle"
                fullWidth
             />
          </Animated.View>

          {/* Photo Capture Button */}
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <GlassCard
              intensity={15}
              padding={theme.spacing.md}
              borderRadius={theme.borderRadius.lg}
              style={styles.photoCard}
            >
              <PremiumButton
                title={photos.length > 0 ? `${photos.length} Photo(s) Captured ✓` : "Capture Photo"}
                onPress={() => setShowPhotoModal(true)}
                variant={photos.length > 0 ? "secondary" : "outline"}
                icon="camera"
                fullWidth
              />
              {photos.length > 0 && (
                <Text style={styles.photoHint}>
                  Tap to add more photos
                </Text>
              )}
            </GlassCard>
          </Animated.View>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <ItemPhotoGallery
              photos={photos}
              editable
              onRemovePhoto={(photoId) => {
                setPhotos((prev) => prev.filter((p) => p.id !== photoId));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              onAddPhoto={() => setShowPhotoModal(true)}
              maxPhotos={5}
            />
          )}

          {/* Notes Section */}
          <ItemNotesSection
            notes={notes}
            onAddNote={(text, type) => {
              const newNote: Note = {
                id: Date.now().toString(),
                text,
                type,
                timestamp: new Date().toISOString(),
                author: user?.full_name || user?.username || "Staff",
              };
              setNotes((prev) => [newNote, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            onDeleteNote={(noteId) => {
              setNotes((prev) => prev.filter((n) => n.id !== noteId));
            }}
            placeholder="Add notes about this item..."
          />

          {/* Spacer for footer */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Actions */}
      <ItemActionsFooter
        actions={[
          {
            type: "cancel",
            onPress: () => router.back(),
          },
          {
            type: "save",
            label: "Save & Verify",
            onPress: handleSubmit,
            loading: loading,
          },
        ]}
        processing={loading}
        animationDelay={600}
      />

      {/* Photo Modal */}
      <PhotoCaptureModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={(photoUri) => {
          if (!photoUri) return;
          setItemPhoto({ uri: photoUri });
          // Add to photo gallery
          const newPhoto: PhotoItem = {
            id: Date.now().toString(),
            uri: photoUri,
            timestamp: new Date().toISOString(),
            type: "OTHER",
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }}
      />

      {/* Share Sheet */}
      <ItemShareSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        item={{
          name: item?.item_name || item?.itemName || "Item",
          barcode,
          quantity: quantity,
          systemQty: item?.system_qty || item?.systemQty,
          category: item?.category,
          location: item?.location,
          lastUpdated: new Date().toISOString(),
        }}
      />

      {/* Quick Actions FAB */}
      <ItemQuickActions
        actions={createItemQuickActions({
          onScan: () => router.push("/staff/scanner"),
          onPhoto: () => setShowPhotoModal(true),
          onShare: () => setShowShareSheet(true),
        })}
        position="bottom-right"
      />

        {/* Serial Scanner */}
        <BarcodeScanner
            visible={showSerialScanner}
            scannerMode="serial"
            continuousScanMode={false}
            isLoadingItem={false}
            expectedSerialCount={1}
            completedSerialCount={0}
            isWeb={Platform.OS === 'web'}
            onBarcodeScanned={handleSerialScanned}
            onClose={() => setShowSerialScanner(false)}
            onToggleContinuousMode={() => {}}
            serialLabel={activeSerialIndex >= 0 ? `Serial #${activeSerialIndex + 1}` : "Serial"}
        />

    </ScreenContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  quantityCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  photoCard: {
    marginBottom: theme.spacing.md,
  },
  photoHint: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
});
