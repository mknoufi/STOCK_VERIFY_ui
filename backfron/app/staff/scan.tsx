// cspell:words pricetag barcodes prioritise
import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { StaffLayout } from "../../src/components/layout";
import { useAuthStore } from "../../src/store/authStore";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { ItemSearch } from "../../src/components/scan/ItemSearch";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";
import {
  getItemByBarcode,
  createCountLine,
  searchItems,
} from "../../src/services/api/api";

export default function ScanScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId)
    ? rawSessionId[0]
    : rawSessionId;
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === "web";
  const [isScanning, setIsScanning] = useState(false);

  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // Search State
  const [manualItemName, setManualItemName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Item State
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");

  // New Features State
  const [serialNumber, setSerialNumber] = useState("");
  const [isSerialEnabled, setIsSerialEnabled] = useState(false);
  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [mrp, setMrp] = useState("");

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout },
    ]);
  };

  const resetForm = () => {
    setScannedItem(null);
    setManualBarcode("");
    setManualItemName("");
    setSearchResults([]);
    setShowSearchResults(false);
    setQuantity("1");
    setSerialNumber("");
    setIsSerialEnabled(false);
    setIsDamageEnabled(false);
    setDamageQty("");
    setMrp("");
  };

  const handleSearchItem = async (query: string) => {
    if (!query || query.length < 3) return;

    setIsSearchingItem(true);
    setShowSearchResults(true);
    try {
      const results = await searchItems(query);
      setSearchResults(results);
    } catch (error: any) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search items");
    } finally {
      setIsSearchingItem(false);
    }
  };

  const handleLookup = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      const item = await getItemByBarcode(barcode, 3, sessionId);
      if (item) {
        setScannedItem(item);
        setMrp(
          item.mrp || item.standard_rate
            ? String(item.mrp || item.standard_rate)
            : "",
        );

        // Duplicate Check
        if (item.previous_count) {
          Alert.alert(
            "Duplicate Scan Warning",
            `Item ${item.item_code} was already counted by ${item.previous_count.counted_by}.\nQty: ${item.previous_count.counted_qty}\nTime: ${new Date(item.previous_count.scanned_at).toLocaleTimeString()}`,
            [{ text: "OK" }],
          );
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Item not found");
      setScannedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCount = async () => {
    if (!scannedItem) return;

    // Validation
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    if (
      isDamageEnabled &&
      (!damageQty || isNaN(Number(damageQty)) || Number(damageQty) < 0)
    ) {
      Alert.alert("Invalid Damage Qty", "Please enter a valid damage quantity");
      return;
    }

    if (isSerialEnabled && !serialNumber.trim()) {
      Alert.alert(
        "Invalid Serial Number",
        "Please scan or enter a serial number",
      );
      return;
    }

    if (!sessionId || typeof sessionId !== "string") {
      Alert.alert("Error", "Invalid Session ID");
      return;
    }

    // Submission Logic
    const submitVerifiedCount = async () => {
      setLoading(true);
      try {
        await createCountLine(
          {
            session_id: sessionId,
            item_code: scannedItem.item_code,
            counted_qty: Number(quantity),
            damaged_qty: isDamageEnabled ? Number(damageQty) : 0,
            sr_no: isSerialEnabled ? serialNumber : undefined,
            mrp_counted: mrp ? Number(mrp) : undefined,
            remark: isDamageEnabled ? "Damage reported" : undefined,
          },
          {
            itemName:
              scannedItem.item_name || scannedItem.name || "Unknown Item",
            username: user?.username || "Unknown User",
          },
        );

        Alert.alert("Success", "Item counted successfully");
        resetForm();
      } catch (error: any) {
        Alert.alert("Error", "Failed to submit count: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    // Smart Variance Check
    const currentQty = Number(quantity);
    const systemQty = Number(
      scannedItem.current_stock || scannedItem.stock_qty || 0,
    );

    if (systemQty > 0) {
      const variance = Math.abs(currentQty - systemQty);
      const variancePercent = variance / systemQty;

      if (variancePercent > 0.5) {
        // 50% variance threshold
        Alert.alert(
          "High Variance Warning",
          `System expects ${systemQty}, but you entered ${currentQty}.\nIs this correct?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Submit", onPress: submitVerifiedCount },
          ],
        );
        return;
      }
    }

    await submitVerifiedCount();
  };

  if (!isWeb && !permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={modernColors.primary[500]} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera" size={48} color={modernColors.text.secondary} />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <PremiumButton title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const headerActions = [
    {
      icon: "list" as const,
      label: "History",
      onPress: () => router.push(`/staff/history?sessionId=${sessionId}`),
    },
    {
      icon: "log-out-outline" as const,
      label: "Logout",
      onPress: handleLogout,
    },
  ];

  return (
    <StaffLayout
      title="Stock Scanner"
      headerActions={headerActions}
      backgroundColor={modernColors.background.default}
      showUser={true}
    >
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scanSection}>
            {/* Scanner / Input Section */}
            {!scannedItem ? (
              <ItemSearch
                manualBarcode={manualBarcode}
                manualItemName={manualItemName}
                searchResults={searchResults}
                isSearching={isSearchingItem}
                showSearchResults={showSearchResults}
                onBarcodeChange={setManualBarcode}
                onItemNameChange={setManualItemName}
                onBarcodeSubmit={() => handleLookup(manualBarcode)}
                onItemNameSubmit={() => handleSearchItem(manualItemName)}
                onSearch={handleSearchItem}
                onScan={() => {
                  setIsScanning(true);
                  // Web simulation
                  if (isWeb) {
                    setTimeout(() => {
                      setIsScanning(false);
                      handleLookup("8901234567890");
                    }, 1000);
                  }
                }}
                onSearchResultSelect={(item: any) => {
                  setScannedItem(item);
                  setMrp(
                    item.mrp || item.standard_rate
                      ? String(item.mrp || item.standard_rate)
                      : "",
                  );
                  setShowSearchResults(false);
                  setManualItemName("");
                  setSearchResults([]);
                }}
                onActivityReset={() => {}}
              />
            ) : (
              /* Item Details & Count Form */
              <View style={styles.formSection}>
                <PremiumCard variant="elevated" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>
                      {scannedItem.item_name || scannedItem.name}
                    </Text>
                    <TouchableOpacity
                      onPress={resetForm}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={28}
                        color={modernColors.text.tertiary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemCode}>
                    Code: {scannedItem.item_code}
                  </Text>
                  <Text style={styles.itemDetail}>
                    Barcode: {scannedItem.barcode}
                  </Text>
                  <Text style={styles.itemDetail}>
                    UOM: {scannedItem.uom || scannedItem.uom_name || "N/A"}
                  </Text>
                  <Text style={styles.itemStock}>
                    Current Stock:{" "}
                    {scannedItem.current_stock || scannedItem.stock_qty || 0}
                  </Text>
                </PremiumCard>

                <View style={styles.formContainer}>
                  {/* Quantity */}
                  <PremiumInput
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                  />

                  {/* Options Section */}
                  <View style={styles.optionsSection}>
                    <Text style={styles.optionsTitle}>Options</Text>

                    {/* Serial Number Toggle */}
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleInfo}>
                        <Ionicons
                          name="qr-code-outline"
                          size={20}
                          color={modernColors.text.secondary}
                        />
                        <Text style={styles.toggleLabel}>
                          Track Serial Number
                        </Text>
                      </View>
                      <Switch
                        value={isSerialEnabled}
                        onValueChange={setIsSerialEnabled}
                        trackColor={{
                          false: modernColors.background.elevated,
                          true: modernColors.primary[500],
                        }}
                        thumbColor={modernColors.background.paper}
                      />
                    </View>

                    {isSerialEnabled && (
                      <View style={styles.indentedInput}>
                        <PremiumInput
                          label="Serial Number"
                          value={serialNumber}
                          onChangeText={setSerialNumber}
                          placeholder="Scan or enter"
                          rightIcon="scan-outline"
                          onRightIconPress={() => {
                            /* Open specific serial scanner if needed */
                          }}
                        />
                      </View>
                    )}

                    {/* Damage Toggle */}
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleInfo}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={20}
                          color={modernColors.text.secondary}
                        />
                        <Text style={styles.toggleLabel}>Record Damage</Text>
                      </View>
                      <Switch
                        value={isDamageEnabled}
                        onValueChange={setIsDamageEnabled}
                        trackColor={{
                          false: modernColors.background.elevated,
                          true: modernColors.error.main,
                        }}
                        thumbColor={modernColors.background.paper}
                      />
                    </View>

                    {isDamageEnabled && (
                      <View style={styles.indentedInput}>
                        <PremiumInput
                          label="Damage Quantity"
                          value={damageQty}
                          onChangeText={setDamageQty}
                          keyboardType="numeric"
                          placeholder="Qty"
                          error={
                            isDamageEnabled && !damageQty
                              ? "Required"
                              : undefined
                          }
                        />
                      </View>
                    )}
                  </View>

                  {/* MRP (Optional) */}
                  <PremiumInput
                    label="MRP (Optional)"
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    placeholder="Enter MRP"
                  />

                  <View style={styles.buttonRow}>
                    <PremiumButton
                      title="Cancel"
                      onPress={resetForm}
                      variant="outline"
                      style={{ flex: 1 }}
                    />
                    <PremiumButton
                      title="Submit Count"
                      onPress={handleSubmitCount}
                      loading={loading}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            )}

            {isScanning && (
              <View style={styles.scannerOverlay}>
                <Text style={styles.scannerText}>Camera Scanner Active...</Text>
                <ActivityIndicator
                  size="large"
                  color={modernColors.text.primary}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </StaffLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: modernSpacing.screenPadding,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
  },
  title: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    textAlign: "center",
    marginBottom: modernSpacing.xs,
  },
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginBottom: modernSpacing.xl,
  },
  scanSection: {
    flex: 1,
    alignItems: "center",
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  scanButton: {
    width: "100%",
    marginBottom: modernSpacing.lg,
  },
  manualSection: {
    width: "100%",
    marginBottom: modernSpacing.lg,
    gap: modernSpacing.md,
  },
  sectionTitle: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: modernSpacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
  actionButton: {
    marginBottom: 0,
    minWidth: 100,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.lg,
    gap: modernSpacing.sm,
    width: "100%",
  },
  webNoticeText: {
    ...modernTypography.body.small,
    color: modernColors.text.primary,
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: modernBorderRadius.lg,
    zIndex: 10,
  },
  scannerText: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
  },
  loadingText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.sm,
  },
  permissionText: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginVertical: modernSpacing.lg,
  },
  // Form Styles
  formSection: {
    width: "100%",
    gap: modernSpacing.md, // Reduced gap for tighter fit
  },
  itemCard: {
    marginBottom: modernSpacing.sm, // Reduced margin
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: modernSpacing.sm,
  },
  itemName: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    flex: 1,
    marginRight: modernSpacing.sm,
  },
  itemCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontFamily: "monospace",
  },
  itemDetail: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    marginTop: 4,
  },
  itemStock: {
    ...modernTypography.label.medium,
    color: modernColors.primary[500],
    marginTop: modernSpacing.sm,
    fontWeight: "600",
  },
  formContainer: {
    gap: modernSpacing.md,
  },
  optionsSection: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    gap: modernSpacing.sm,
  },
  optionsTitle: {
    ...modernTypography.label.large,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: modernSpacing.sm,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.sm,
  },
  toggleLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  indentedInput: {
    marginLeft: modernSpacing.lg, // Visual hierarchy
    marginBottom: modernSpacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginTop: modernSpacing.md,
  },
});
