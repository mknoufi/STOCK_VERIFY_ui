// cspell:words pricetag barcodes prioritise
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Image,
  Platform,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, CameraView } from "expo-camera";
import { StaffLayout } from "../../src/components/layout";
import { useAuthStore } from "../../src/store/authStore";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { ItemFilters, FilterValues } from "../../src/components/ItemFilters";
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
  getSession,
} from "../../src/services/api/api";
import { scanDeduplicationService } from "../../src/services/scanDeduplicationService";
import { SearchableSelectModal } from "../../src/components/modals/SearchableSelectModal";
import { PhotoCaptureModal } from "../../src/components/modals/PhotoCaptureModal";
import { BulkEntryModal } from "../../src/components/modals/BulkEntryModal";

const CATEGORY_OPTIONS = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Groceries",
  "Stationery",
  "Others",
];
const SUBCATEGORY_OPTIONS = [
  "Mobile",
  "Laptop",
  "Table",
  "Chair",
  "Shirt",
  "Pants",
  "Fruits",
  "Vegetables",
  "Pen",
  "Paper",
];
const CONDITION_OPTIONS = ["Aging", "Non-moving", "Rate Issue", "Scratches", "Damaged"];

export default function ScanScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === "web";
  const [isScanning, setIsScanning] = useState(false);

  // Reset deduplication history when session changes
  useEffect(() => {
    scanDeduplicationService.resetHistory();
  }, [sessionId]);

  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // Debug state for visible debugging - MUST BE BEFORE useEffects that use addDebug
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const addDebug = (msg: string) => {
    console.log(msg);
    setDebugInfo((prev) => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const fetchSession = async () => {
      if (sessionId) {
        try {
          const details = await getSession(sessionId);
          setSessionDetails(details);
        } catch (error) {
          console.error("Failed to fetch session details:", error);
        }
      }
    };
    fetchSession();
  }, [sessionId]);

  // Add mount debug info
  // Add mount debug info
  useEffect(() => {
    addDebug(`ScanScreen mounted, sessionId: ${sessionId || "NONE"}`);
    addDebug(`User: ${user?.username || "not logged in"}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search State
  const [manualItemName, setManualItemName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Item State
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");

  // New Features State
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [currentSerial, setCurrentSerial] = useState("");
  const [isSerialEnabled, setIsSerialEnabled] = useState(false);
  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [mrp, setMrp] = useState("");

  // Correction State
  const [mfgDate, setMfgDate] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [remark, setRemark] = useState("");

  // Modern UI State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoType, setPhotoType] = useState<"item" | "verification">("item");
  const [itemPhoto, setItemPhoto] = useState<any>(null);
  const [verificationPhoto, setVerificationPhoto] = useState<{
    base64?: string;
    uri: string;
  } | null>(null);

  // Filters State
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filters, setFilters] = useState<FilterValues>({});
  const [damageIncluded, setDamageIncluded] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Bulk Entry Handler
  const handleBulkSubmit = async (barcodes: string[]) => {
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    let failedItems: string[] = [];

    for (const barcode of barcodes) {
      try {
        // 1. Get Item Details
        const item = await getItemByBarcode(barcode);
        if (!item) {
          throw new Error("Item not found");
        }

        // 2. Submit Count (Default Qty: 1)
        await createCountLine({
          session_id: sessionId,
          item_code: item.item_code,
          counted_qty: 1,
          photo_base64: undefined,
          photo_proofs: undefined,
          // Defaulting other fields
        });

        // 3. Record for deduplication
        scanDeduplicationService.recordScan(item.item_code);
        successCount++;
      } catch (error) {
        failCount++;
        failedItems.push(barcode);
        console.warn(`Bulk add failed for ${barcode}`, error);
      }
    }

    setLoading(false);

    let message = `Successfully added ${successCount} items.`;
    if (failCount > 0) {
      message += `\nFailed: ${failCount} items (${failedItems.slice(0, 3).join(", ")}${failedItems.length > 3 ? "..." : ""})`;
    }

    Alert.alert("Bulk Entry Complete", message);
  };

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
    setSerialNumbers([]);
    setCurrentSerial("");
    setIsSerialEnabled(false);
    setIsDamageEnabled(false);
    setDamageQty("");
    setMrp("");
    setMfgDate("");
    setCategory("");
    setSubCategory("");
    setCondition("");
    setRemark("");
    setItemPhoto(null);
    setVerificationPhoto(null);
    setDamageIncluded(true);
    setIsManualEntry(false);
  };

  const handlePhotoCapture = (photo: any) => {
    if (photoType === "item") {
      setItemPhoto(photo);
    } else {
      setVerificationPhoto(photo);
    }
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

  const handleScan = async ({ data }: { data: string }) => {
    // Deduplication Check
    const { isDuplicate, reason } = scanDeduplicationService.checkDuplicate(data);
    if (isDuplicate) {
      Vibration.vibrate([0, 50, 50, 50]); // Error pattern
      Alert.alert("Duplicate Scan Ignored", reason);
      // Do not stop scanning entirely, just ignore this one
      return;
    }

    setIsScanning(false);
    setIsManualEntry(false);
    await handleLookup(data);
  };

  const handleManualSubmit = async () => {
    addDebug(`handleManualSubmit called, barcode: ${manualBarcode}`);
    if (!manualBarcode) {
      addDebug("No barcode provided, returning early");
      return;
    }
    setIsManualEntry(true);
    await handleLookup(manualBarcode);
  };

  const handleLookup = async (barcode: string) => {
    if (!barcode.trim()) return;

    addDebug(`handleLookup called with barcode: ${barcode}`);
    addDebug(`sessionId: ${sessionId}`);

    setLoading(true);
    try {
      addDebug("Calling getItemByBarcode...");
      const item = await getItemByBarcode(barcode, 3);
      addDebug(`getItemByBarcode returned: ${item ? item.item_name : "null"}`);

      if (item) {
        addDebug(`Item found: ${item.item_code} - ${item.item_name}`);
        setScannedItem(item);
        setMrp(item.mrp || item.standard_rate ? String(item.mrp || item.standard_rate) : "");
        setCategory(item.category || "");
        setSubCategory(item.subcategory || "");

        // Duplicate Check
        if (item.previous_count) {
          Alert.alert(
            "Duplicate Scan Warning",
            `Item ${item.item_code} was already counted by ${item.previous_count.counted_by}.\nQty: ${item.previous_count.counted_qty}\nTime: ${new Date(item.previous_count.scanned_at).toLocaleTimeString()}`,
            [{ text: "OK" }],
          );
        }
      } else {
        addDebug("No item returned from getItemByBarcode");
      }
    } catch (error: any) {
      addDebug(`Lookup error: ${error.message || error}`);
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

    if (isDamageEnabled && (!damageQty || isNaN(Number(damageQty)) || Number(damageQty) < 0)) {
      Alert.alert("Invalid Damage Qty", "Please enter a valid damage quantity");
      return;
    }

    if (isSerialEnabled) {
      if (serialNumbers.length !== Number(quantity)) {
        Alert.alert(
          "Serial Number Mismatch",
          `You entered ${quantity} quantity but provided ${serialNumbers.length} serial numbers. They must match.`,
        );
        return;
      }
    }

    if (!sessionId || typeof sessionId !== "string") {
      Alert.alert("Error", "Invalid Session ID");
      return;
    }

    // Submission Logic
    const submitVerifiedCount = async () => {
      setLoading(true);
      try {
        const payload: any = {
          session_id: sessionId,
          item_code: scannedItem.item_code,
          counted_qty: Number(quantity),
          damaged_qty: isDamageEnabled ? Number(damageQty) : 0,
          damage_included: isDamageEnabled ? damageIncluded : undefined,
          item_condition: condition || undefined,
          remark: remark || undefined,
          photo_base64: itemPhoto?.base64,
          photo_proofs: verificationPhoto
            ? [
                {
                  id: Date.now().toString(),
                  url: verificationPhoto.base64,
                  timestamp: new Date().toISOString(),
                },
              ]
            : undefined,
          mrp_counted: mrp ? Number(mrp) : undefined,
          category_correction: category || undefined,
          subcategory_correction: subCategory || undefined,
          manufacturing_date: mfgDate || undefined,
        };

        if (isSerialEnabled) {
          payload.serial_numbers = serialNumbers;
        }

        await createCountLine(payload);

        // Record successful scan for deduplication
        scanDeduplicationService.recordScan(scannedItem.item_code || scannedItem.barcode);

        // Success haptic feedback
        Vibration.vibrate(50);

        Alert.alert("✅ Success", "Item counted successfully");
        resetForm();
      } catch (error: any) {
        Alert.alert("Error", "Failed to submit count: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    // Smart Variance Check
    // Smart Variance Check
    // Skip if in BLIND mode
    if (sessionDetails?.type !== "BLIND") {
      const currentQty = Number(quantity);
      const systemQty = Number(scannedItem.current_stock || scannedItem.stock_qty || 0);

      if (systemQty > 0 && currentQty !== systemQty) {
        Alert.alert(
          "Variance Detected",
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

  if (!isWeb && !permission) {
    return <View />;
  }

  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <PremiumButton onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Debug Panel - Visible on screen */}
          {__DEV__ && debugInfo.length > 0 && (
            <View style={{ backgroundColor: "#1a1a2e", padding: 10, margin: 10, borderRadius: 8 }}>
              <Text style={{ color: "#00ff88", fontWeight: "bold", marginBottom: 5 }}>
                🔍 Debug Log:
              </Text>
              {debugInfo.map((msg, i) => (
                <Text
                  key={i}
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                  }}
                >
                  {msg}
                </Text>
              ))}
              <TouchableOpacity onPress={() => setDebugInfo([])} style={{ marginTop: 5 }}>
                <Text style={{ color: "#ff6b6b", fontSize: 12 }}>Clear Logs</Text>
              </TouchableOpacity>
            </View>
          )}

          {sessionDetails && (
            <View style={styles.sessionInfoCard}>
              <View style={styles.sessionInfoRow}>
                <Ionicons name="business-outline" size={16} color={modernColors.text.secondary} />
                <Text style={styles.sessionInfoText}>{sessionDetails.warehouse}</Text>
              </View>
              {(sessionDetails.floor || sessionDetails.rack) && (
                <View style={styles.sessionInfoRow}>
                  <Ionicons name="location-outline" size={16} color={modernColors.text.secondary} />
                  <Text style={styles.sessionInfoText}>
                    {[sessionDetails.floor, sessionDetails.rack].filter(Boolean).join(" - ")}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Rack Progress & Filters */}
          <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <ItemFilters
              onFilterChange={setFilters}
              showVerifiedFilter={false}
              showSearch={false}
              sessionId={typeof sessionId === "string" ? sessionId : undefined}
            />
          </View>

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
                onBarcodeSubmit={handleManualSubmit}
                onItemNameSubmit={() => handleSearchItem(manualItemName)}
                onSearch={handleSearchItem}
                onScan={() => setIsScanning(true)}
                onSearchResultSelect={(item: any) => {
                  setScannedItem(item);
                  setMrp(
                    item.mrp || item.standard_rate ? String(item.mrp || item.standard_rate) : "",
                  );
                  setCategory(item.category || "");
                  setSubCategory(item.subcategory || "");
                  setShowSearchResults(false);
                  setManualItemName("");
                  setSearchResults([]);
                  setIsManualEntry(true); // Selecting from search is manual
                }}
                onActivityReset={() => {}}
                onBulkEntry={() => setShowBulkModal(true)}
              />
            ) : (
              /* Item Details & Count Form */
              <View style={styles.formSection}>
                <PremiumCard variant="elevated" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    {scannedItem.image_url && (
                      <Image
                        source={{ uri: scannedItem.image_url }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        {scannedItem.item_name || scannedItem.name}
                      </Text>
                      <Text style={styles.itemCode}>{scannedItem.barcode || "N/A"}</Text>
                    </View>
                    <TouchableOpacity onPress={resetForm}>
                      <Ionicons name="close-circle" size={28} color={modernColors.text.tertiary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemMetaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Item Code</Text>
                      <Text style={styles.metaValue}>{scannedItem.item_code}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Stock Qty</Text>
                      <Text style={styles.metaValue}>
                        {sessionDetails?.type === "BLIND"
                          ? "---"
                          : scannedItem.current_stock || scannedItem.stock_qty || 0}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>UOM</Text>
                      <Text style={styles.metaValue}>
                        {scannedItem.uom || scannedItem.uom_name || "N/A"}
                      </Text>
                    </View>
                  </View>
                </PremiumCard>

                <View style={styles.formContainer}>
                  {/* Photo Proofs Section */}
                  <View style={styles.photoSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="camera-outline" size={18} color={modernColors.text.secondary} />
                      <Text style={styles.sectionTitle}>Photo Proofs</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <View style={styles.photoRow}>
                      <TouchableOpacity
                        style={[
                          styles.photoButton,
                          { flex: 1 },
                          itemPhoto && styles.photoButtonActive,
                        ]}
                        onPress={() => {
                          setPhotoType("item");
                          setShowPhotoModal(true);
                        }}
                      >
                        {itemPhoto ? (
                          <Image source={{ uri: itemPhoto.uri }} style={styles.photoPreview} />
                        ) : (
                          <Ionicons
                            name="camera-outline"
                            size={24}
                            color={modernColors.text.secondary}
                          />
                        )}
                        <Text style={styles.photoLabel}>Add Item Photo (Optional)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quantity */}
                  <PremiumInput
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                  />

                  {/* MRP & Mfg Date */}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <PremiumInput
                        label="MRP"
                        value={mrp}
                        onChangeText={setMrp}
                        keyboardType="numeric"
                        placeholder="MRP"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PremiumInput
                        label="Mfg Date"
                        value={mfgDate}
                        onChangeText={setMfgDate}
                        placeholder="YYYY-MM-DD"
                      />
                    </View>
                  </View>

                  {/* Category & Subcategory */}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Category</Text>
                      <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowCategoryModal(true)}
                      >
                        <Text
                          style={[styles.selectorText, !category && styles.placeholderText]}
                          numberOfLines={1}
                        >
                          {category || "Select"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={modernColors.text.tertiary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Sub-Category</Text>
                      <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowSubCategoryModal(true)}
                      >
                        <Text
                          style={[styles.selectorText, !subCategory && styles.placeholderText]}
                          numberOfLines={1}
                        >
                          {subCategory || "Select"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={modernColors.text.tertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Conditions */}
                  <View style={styles.conditionsSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={modernColors.text.secondary} />
                      <Text style={styles.sectionTitle}>Item Condition</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowConditionModal(true)}>
                      <View pointerEvents="none">
                        <PremiumInput
                          label="Condition"
                          value={condition}
                          placeholder="Select Condition"
                          editable={false}
                          rightIcon="chevron-down"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Remarks */}
                  <PremiumInput
                    label="Remarks"
                    value={remark}
                    onChangeText={setRemark}
                    placeholder="Enter remarks (optional)"
                    multiline
                    numberOfLines={2}
                  />

                  {/* Damage Toggle */}
                  <View style={styles.toggleCard}>
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
                      />
                    </View>

                    {isDamageEnabled && (
                      <View style={styles.expandedSection}>
                        <PremiumInput
                          label="Damage Quantity"
                          value={damageQty}
                          onChangeText={setDamageQty}
                          keyboardType="numeric"
                          placeholder="Qty"
                        />
                        <TouchableOpacity
                          style={styles.checkboxRow}
                          onPress={() => setDamageIncluded(!damageIncluded)}
                        >
                          <Ionicons
                            name={damageIncluded ? "checkbox" : "square-outline"}
                            size={20}
                            color={modernColors.primary[500]}
                          />
                          <Text style={styles.checkboxLabel}>Include in physical count?</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Serial Number Toggle */}
                  <View style={styles.toggleCard}>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleInfo}>
                        <Ionicons
                          name="qr-code-outline"
                          size={20}
                          color={modernColors.text.secondary}
                        />
                        <Text style={styles.toggleLabel}>Track Serial Numbers</Text>
                      </View>
                      <Switch
                        value={isSerialEnabled}
                        onValueChange={setIsSerialEnabled}
                        trackColor={{
                          false: modernColors.background.elevated,
                          true: modernColors.primary[500],
                        }}
                      />
                    </View>

                    {isSerialEnabled && (
                      <View style={styles.expandedSection}>
                        <Text style={styles.helperText}>
                          {serialNumbers.length} / {quantity} Serial Numbers
                        </Text>
                        <PremiumInput
                          label="Add Serial"
                          value={currentSerial}
                          onChangeText={setCurrentSerial}
                          placeholder="Scan or enter"
                          rightIcon="add-circle"
                          onRightIconPress={() => {
                            if (
                              currentSerial.trim() &&
                              !serialNumbers.includes(currentSerial.trim())
                            ) {
                              setSerialNumbers([...serialNumbers, currentSerial.trim()]);
                              setCurrentSerial("");
                            }
                          }}
                        />
                        <View style={styles.serialList}>
                          {serialNumbers.map((sn, index) => (
                            <View key={index} style={styles.serialChip}>
                              <Text style={styles.serialChipText}>{sn}</Text>
                              <TouchableOpacity
                                onPress={() =>
                                  setSerialNumbers(serialNumbers.filter((s) => s !== sn))
                                }
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={16}
                                  color={modernColors.text.tertiary}
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

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
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={handleScan}
                />
                <View style={styles.scannerOverlayContent}>
                  <Text style={styles.scannerText}>Scan Barcode</Text>
                  <TouchableOpacity
                    style={styles.closeScannerButton}
                    onPress={() => setIsScanning(false)}
                  >
                    <Ionicons name="close-circle" size={48} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <SearchableSelectModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={setCategory}
        options={CATEGORY_OPTIONS}
        title="Select Category"
      />

      <SearchableSelectModal
        visible={showSubCategoryModal}
        onClose={() => setShowSubCategoryModal(false)}
        onSelect={setSubCategory}
        options={SUBCATEGORY_OPTIONS}
        title="Select Sub-Category"
      />

      <SearchableSelectModal
        visible={showConditionModal}
        onClose={() => setShowConditionModal(false)}
        onSelect={setCondition}
        options={CONDITION_OPTIONS}
        title="Select Condition"
      />

      <PhotoCaptureModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={handlePhotoCapture}
        title={photoType === "item" ? "Capture Item" : "Capture Verification"}
      />

      <BulkEntryModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkSubmit}
      />
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
    marginLeft: 8,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  optionalBadge: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    backgroundColor: modernColors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "600",
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
    gap: modernSpacing.md,
  },
  itemCard: {
    marginBottom: modernSpacing.sm,
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
    marginBottom: 4,
  },
  itemCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontFamily: "monospace",
  },
  itemMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: modernSpacing.md,
    paddingTop: modernSpacing.md,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  metaItem: {
    alignItems: "center",
  },
  metaLabel: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    marginBottom: 2,
  },
  metaValue: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "600",
  },

  formContainer: {
    gap: modernSpacing.md,
  },
  photoSection: {
    gap: modernSpacing.sm,
  },
  photoRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
  },
  photoButton: {
    flex: 1,
    height: 100,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderStyle: "dashed",
    gap: modernSpacing.xs,
  },
  photoButtonActive: {
    borderStyle: "solid",
    borderColor: modernColors.primary[500],
    backgroundColor: modernColors.background.paper,
  },
  photoButtonRequired: {
    borderColor: modernColors.warning.main,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: modernBorderRadius.md,
    position: "absolute",
  },
  photoLabel: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
  },
  row: {
    flexDirection: "row",
    gap: modernSpacing.md,
  },
  conditionsSection: {
    gap: modernSpacing.sm,
  },
  conditionsList: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    overflow: "hidden",
  },
  conditionToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  conditionLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  // Legacy styles kept for reference or if reverted
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: modernBorderRadius.full,
    backgroundColor: modernColors.background.elevated,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  chipActive: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[500],
  },
  chipText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  toggleCard: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.sm,
  },
  toggleLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "500",
  },
  expandedSection: {
    marginTop: modernSpacing.md,
    paddingTop: modernSpacing.md,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
    gap: modernSpacing.md,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.sm,
  },
  checkboxLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginTop: modernSpacing.md,
    marginBottom: modernSpacing.xl,
  },
  helperText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  serialList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.xs,
  },
  serialChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    gap: 4,
  },
  serialChipText: {
    ...modernTypography.body.small,
    color: modernColors.text.primary,
  },
  scannerOverlayContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
    width: "100%",
  },
  closeScannerButton: {
    padding: 20,
  },
  sessionInfoCard: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.xs,
  },
  sessionInfoText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontWeight: "500",
  },
  inputLabel: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
    fontWeight: "600",
  },
  selectorButton: {
    backgroundColor: modernColors.background.paper,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderRadius: modernBorderRadius.md,
    paddingHorizontal: modernSpacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: modernColors.text.tertiary,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: modernBorderRadius.md,
    marginRight: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
  },
});
