// cspell:words pricetag barcodes prioritise
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Image,
  Platform,
  Vibration,
  TextInput,
  Modal,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, CameraView } from "expo-camera";
import { StaffLayout } from "@/components/layout";
import { useAuthStore } from "@/store/authStore";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { PremiumInput } from "@/components/premium/PremiumInput";
import { ItemFilters, FilterValues } from "@/components/ItemFilters";
import { LocationVerificationSection } from "@/components/scan/LocationVerificationSection";
import { ItemSearch } from "@/components/scan/ItemSearch";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
// removed unused components: PremiumCard, AnimatedPressable
import {
  useScanState,
  usePhotoState,
  useItemState,
  useWorkflowState,
} from "@/hooks/scan";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "@/styles/modernDesignSystem";
import {
  getItemByBarcode,
  createCountLine,
  searchItems,
  getSession,
  checkItemCounted,
  getVarianceReasons,
  addQuantityToCountLine,
} from "@/services/api/api";
import { scanDeduplicationService } from "@/services/scanDeduplicationService";
import { SearchableSelectModal } from "@/components/modals/SearchableSelectModal";
import { PhotoCaptureModal } from "@/components/modals/PhotoCaptureModal";
import { BulkEntryModal } from "@/components/modals/BulkEntryModal";
import {
  AnalyticsService,
  RecentItemsService,
} from "@/services/enhancedFeatures";
import { handleErrorWithRecovery } from "@/services/errorRecovery";
import { VarianceReason, CreateCountLinePayload } from "@/types/scan";
import {
  normalizeSerialValue,
  getNormalizedMrpVariants,
  getDefaultMrpForItem,
} from "@/utils/scanUtils";
import { RecentRacksService } from "@/services/recentRacksService";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
const CONDITION_OPTIONS = [
  "Aging",
  "Non-moving",
  "Rate Issue",
  "Scratches",
  "Damaged",
];

// Helper function to get display name for items with empty item_name
const getItemDisplayName = (item: any): string => {
  if (item?.item_name && item.item_name.trim()) return item.item_name;
  if (item?.name && item.name.trim()) return item.name;
  if (item?.category && item.category.trim()) return item.category;
  if (item?.item_code) return `Item ${item.item_code}`;
  return "Unknown Item";
};

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
    setDebugInfo((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: ${msg}`,
    ]);
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
  const [damageType, setDamageType] = useState<
    "returned" | "returnable" | "nonreturnable"
  >("returnable");
  const [damageRemark, setDamageRemark] = useState("");
  const [damageIncluded, setDamageIncluded] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [mrp, setMrp] = useState("");

  // Correction State
  const [mfgDate, setMfgDate] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [condition, setCondition] = useState("Good");
  const [remark, setRemark] = useState("");

  // Modern UI State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [photoType, setPhotoType] = useState<
    "item" | "verification" | "serial"
  >("item");
  const [itemPhoto, setItemPhoto] = useState<any>(null);
  const [, setSerialPhoto] = useState<any>(null);
  const [verificationPhoto, setVerificationPhoto] = useState<{
    base64?: string;
    uri: string;
  } | null>(null);

  // Filters State
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filters, setFilters] = useState<FilterValues>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Enhanced Feature State - Using Custom Hooks
  const { resetScannerState } = useScanState();
  const { resetPhotoState } = usePhotoState();
  const { itemState, updateItemState, resetItemState } = useItemState();
  const { resetWorkflowState } = useWorkflowState();

  // Additional Enhanced State
  const [varianceReasons, setVarianceReasons] = useState<VarianceReason[]>([]);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [showAddQuantityModal, setShowAddQuantityModal] = useState(false);
  const [existingCountLine, setExistingCountLine] = useState<any>(null);
  const [additionalQty, setAdditionalQty] = useState("");
  const [sessionActive, setSessionActive] = useState(false);

  // New UI State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [recentRacks, setRecentRacks] = useState<string[]>([]);
  const handleClearRecentRacks = async () => {
    try {
      const floor = itemState.floorNo ?? "";
      if (!floor) return;
      if (!sessionId || typeof sessionId !== "string") return;
      await RecentRacksService.clear(sessionId, floor);
      const list = await RecentRacksService.getRecent(sessionId, floor, 5);
      setRecentRacks(list);
    } catch {
      // no-op
    }
  };

  // Load variance reasons on mount
  useEffect(() => {
    const loadVarianceReasons = async () => {
      try {
        const reasons = await getVarianceReasons();
        setVarianceReasons(Array.isArray(reasons) ? reasons : []);
      } catch (error) {
        console.error("Failed to load variance reasons:", error);
      }
    };
    loadVarianceReasons();
  }, []);

  // Initialize session location from session details
  useEffect(() => {
    if (sessionDetails?.warehouse) {
      const parts = sessionDetails.warehouse.split(" - ");
      if (parts.length >= 2) {
        updateItemState({ floorNo: parts[0], rackNo: parts[1] });
      } else {
        updateItemState({ floorNo: sessionDetails.warehouse });
      }
      setSessionActive(true);
    }
  }, [sessionDetails, updateItemState]);

  // Load recent racks when floor/session changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!sessionId || typeof sessionId !== "string") return;
      const list = await RecentRacksService.getRecent(
        sessionId,
        itemState.floorNo,
        5,
      );
      if (!cancelled) setRecentRacks(list);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, itemState.floorNo]);

  // Bulk Entry Handler
  const handleBulkSubmit = async (barcodes: string[]) => {
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    let failedItems: string[] = [];

    for (const barcode of barcodes) {
      try {
        // Validate barcode before attempting lookup
        const b = (barcode || "").trim();
        if (b.length < 6) {
          failCount++;
          failedItems.push(barcode);
          continue;
        }
        // 1. Get Item Details
        const item = await getItemByBarcode(b);
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

  const resetForm = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    setCondition("Good");
    setRemark("");
    setItemPhoto(null);
    setVerificationPhoto(null);
    setDamageIncluded(false);
    setIsManualEntry(false);
    // Reset enhanced state
    resetItemState();
    resetPhotoState();
    resetWorkflowState();
    resetScannerState();
    setExistingCountLine(null);
    setShowAddQuantityModal(false);
    setAdditionalQty("");
    setShowVarianceModal(false);
    setShowVerificationModal(false);
    setSerialPhoto(null);
    setDamageType("returnable");
    setDamageRemark("");
  }, [resetItemState, resetPhotoState, resetWorkflowState, resetScannerState]);

  // Handle adding quantity to existing count line
  const handleAddQuantity = useCallback(async () => {
    if (!existingCountLine || !additionalQty) return;

    const addQty = parseFloat(additionalQty);
    if (isNaN(addQty) || addQty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid positive number");
      return;
    }

    try {
      setLoading(true);
      const newTotalQty = (existingCountLine.counted_qty || 0) + addQty;

      await addQuantityToCountLine(existingCountLine.id, addQty);

      Alert.alert(
        "Success",
        `Added ${addQty} to existing count\n\nNew Total: ${newTotalQty} ${scannedItem?.uom_name || ""}`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowAddQuantityModal(false);
              resetForm();
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add quantity");
    } finally {
      setLoading(false);
    }
  }, [existingCountLine, additionalQty, scannedItem?.uom_name, resetForm]);

  const handlePhotoCapture = (photo: any) => {
    if (photoType === "item") {
      setItemPhoto(photo);
    } else {
      setVerificationPhoto(photo);
    }
  };

  // Debounced search to reduce API calls and avoid stale results
  const latestSearchRef = React.useRef<number>(0);
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handleSearchItem = (query: string) => {
    const q = (query || "").trim();
    setManualItemName(q);
    if (searchTimer) {
      clearTimeout(searchTimer);
      setSearchTimer(null);
    }
    if (!q || q.length < 3) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }
    const token = Date.now();
    latestSearchRef.current = token;
    setIsSearchingItem(true);
    setShowSearchResults(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchItems(q);
        if (latestSearchRef.current !== token) return; // ignore stale
        setSearchResults(results);
      } catch (error: any) {
        console.error("Search error:", error);
        Alert.alert("Error", "Failed to search items");
      } finally {
        if (latestSearchRef.current === token) setIsSearchingItem(false);
      }
    }, 350);
    setSearchTimer(t);
  };

  const handleScan = async ({ data }: { data: string }) => {
    // Deduplication Check
    const { isDuplicate, reason } =
      scanDeduplicationService.checkDuplicate(data);
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
      addDebug(
        `getItemByBarcode returned: ${item ? getItemDisplayName(item) : "null"}`,
      );

      if (item) {
        addDebug(`Item found: ${item.item_code} - ${getItemDisplayName(item)}`);

        // Track analytics
        AnalyticsService.trackItemScan(
          item.item_code,
          getItemDisplayName(item),
        ).catch(() => {});

        // Add to recent items
        RecentItemsService.addRecent(item.item_code, item).catch(() => {});

        // Check if item was already counted in this session
        if (sessionId && item.item_code) {
          try {
            const countCheck = await checkItemCounted(
              sessionId,
              item.item_code,
            );

            if (
              countCheck.already_counted &&
              countCheck.count_lines?.length > 0
            ) {
              const existingLine = countCheck.count_lines[0];
              setExistingCountLine(existingLine);

              // Show duplicate options
              Alert.alert(
                "🔄 Duplicate Scan Detected",
                `${getItemDisplayName(item)}\n\nCurrent Count: ${existingLine.counted_qty} ${item.uom_name || ""}\nCounted by: ${existingLine.counted_by}\n\nWhat would you like to do?`,
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => resetForm(),
                  },
                  {
                    text: "Add Quantity",
                    onPress: () => {
                      setScannedItem(item);
                      setAdditionalQty("1");
                      setShowAddQuantityModal(true);
                    },
                  },
                  {
                    text: "Count Again",
                    onPress: () => {
                      setExistingCountLine(null);
                      prepareItemForCounting(item);
                    },
                  },
                ],
              );
              return;
            }
          } catch (error) {
            console.warn("Could not check item count status:", error);
          }
        }

        prepareItemForCounting(item);
      } else {
        addDebug("No item returned from getItemByBarcode");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Item not found");
      }
    } catch (error: any) {
      addDebug(`Lookup error: ${error.message || error}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Item not found");
      setScannedItem(null);
    } finally {
      setLoading(false);
    }
  };

  // Prepare item for counting (extracted for reuse)
  const prepareItemForCounting = useCallback(
    (item: any) => {
      // Haptic feedback on successful item lookup
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setScannedItem(item);
      setMrp(
        item.mrp || item.standard_rate
          ? String(item.mrp || item.standard_rate)
          : "",
      );
      setCategory(item.category || "");
      setSubCategory(item.subcategory || "");

      // Update itemState with MRP variants
      const mrpDefault = getDefaultMrpForItem(item);
      updateItemState({
        currentItem: item,
        countedMrp: mrpDefault,
        mrpVariantOptions: getNormalizedMrpVariants(item),
      });
    },
    [updateItemState],
  );

  const handleSubmitCount = useCallback(async () => {
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
        const payload: CreateCountLinePayload = {
          session_id: sessionId,
          item_code: scannedItem.item_code,
          counted_qty: Number(quantity),
          damaged_qty: isDamageEnabled ? Number(damageQty) : 0,
          damage_included: isDamageEnabled ? damageIncluded : undefined,
          item_condition: condition || undefined,
          remark: (() => {
            const tag = isDamageEnabled ? ` [Damage: ${damageType}]` : "";
            if (remark && tag) return `${remark}${tag}`;
            return remark || tag || undefined;
          })(),
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
          // Enhanced fields
          variance_reason: itemState.selectedReason || undefined,
          variance_note: itemState.varianceNote || undefined,
          floor_no: itemState.floorNo || undefined,
          rack_no: itemState.rackNo || undefined,
          mark_location: itemState.markLocation || undefined,
          sr_no: itemState.srNo || undefined,
        };

        if (isSerialEnabled) {
          payload.serial_numbers = serialNumbers.map((sn, idx) => ({
            label: `Serial #${idx + 1}`,
            value: normalizeSerialValue(sn),
            captured_at: new Date().toISOString(),
          }));
        }

        await handleErrorWithRecovery(() => createCountLine(payload), {
          context: "Save Count",
          recovery: { maxRetries: 3 },
          showAlert: true,
        });

        // Record recent rack for this floor
        if (
          typeof sessionId === "string" &&
          (itemState.floorNo || "") &&
          (itemState.rackNo || "")
        ) {
          RecentRacksService.addRecent(
            sessionId,
            itemState.floorNo,
            itemState.rackNo!,
          ).catch(() => {});
        }

        // Track analytics
        AnalyticsService.trackCount(
          scannedItem.item_code,
          Number(quantity),
        ).catch(() => {});

        // Record successful scan for deduplication
        scanDeduplicationService.recordScan(
          scannedItem.item_code || scannedItem.barcode,
        );

        // Success haptic feedback - enhanced
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert("✅ Success", "Item counted successfully");
        resetForm();

        // Refresh recent racks after submission
        if (typeof sessionId === "string") {
          RecentRacksService.getRecent(sessionId, itemState.floorNo, 5)
            .then(setRecentRacks)
            .catch(() => {});
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to submit count: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    // Smart Variance Check
    // Skip if in BLIND mode
    if (sessionDetails?.type !== "BLIND") {
      const currentQty = Number(quantity);
      const systemQty = Number(
        scannedItem.current_stock || scannedItem.stock_qty || 0,
      );

      if (systemQty > 0 && currentQty !== systemQty) {
        // Check if variance reason is required and not yet selected
        if (!itemState.selectedReason && varianceReasons.length > 0) {
          setShowVarianceModal(true);
          return;
        }

        // If no variance reasons configured, show simple confirmation
        if (varianceReasons.length === 0) {
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
    }

    await submitVerifiedCount();
  }, [
    scannedItem,
    quantity,
    isDamageEnabled,
    damageQty,
    isSerialEnabled,
    serialNumbers,
    sessionId,
    mrp,
    remark,
    damageType,
    damageIncluded,
    itemPhoto,
    verificationPhoto,
    itemState,
    sessionDetails,
    varianceReasons,
    resetForm,
    category,
    condition,
    mfgDate,
    subCategory,
  ]);

  // Handle variance reason selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVarianceReasonSubmit = useCallback(
    (reason: string, note?: string) => {
      updateItemState({
        selectedReason: reason,
        varianceNote: note || "",
      });
      setShowVarianceModal(false);
      // Continue with submission after selecting reason
      handleSubmitCount();
    },
    [updateItemState, handleSubmitCount],
  );

  if (!isWeb && !permission) {
    return (
      <View style={styles.center}>
        <Skeleton
          width={50}
          height={50}
          borderRadius={25}
          style={{ marginBottom: 12 }}
        />
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
        <Text style={styles.permissionText}>
          We need your permission to show the camera
        </Text>
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Debug Panel - Visible on screen */}
          {__DEV__ && debugInfo.length > 0 && (
            <View
              style={{
                backgroundColor: "#1a1a2e",
                padding: 10,
                margin: 10,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#00ff88",
                  fontWeight: "bold",
                  marginBottom: 5,
                }}
              >
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
              <TouchableOpacity
                onPress={() => setDebugInfo([])}
                style={{ marginTop: 5 }}
              >
                <Text style={{ color: "#ff6b6b", fontSize: 12 }}>
                  Clear Logs
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!sessionDetails ? (
            <View style={styles.sessionInfoCard}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Skeleton width={20} height={20} borderRadius={10} />
                <Skeleton width="60%" height={16} />
              </View>
              <Skeleton width="40%" height={16} style={{ marginLeft: 28 }} />
            </View>
          ) : (
            <FadeIn direction="down" delay={0} duration={250}>
              <View style={styles.sessionInfoCard}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: sessionActive
                        ? modernColors.success.main
                        : modernColors.text.tertiary,
                    }}
                  />
                  <View style={styles.sessionInfoRow}>
                    <Ionicons
                      name="business"
                      size={14}
                      color={modernColors.primary[500]}
                    />
                    <Text style={styles.sessionInfoText}>
                      {sessionDetails.warehouse}
                    </Text>
                  </View>
                </View>
                {(sessionDetails.floor || sessionDetails.rack) && (
                  <View style={styles.sessionInfoRow}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={modernColors.primary[500]}
                    />
                    <Text style={styles.sessionInfoText}>
                      {[sessionDetails.floor, sessionDetails.rack]
                        .filter(Boolean)
                        .join(" - ")}
                    </Text>
                  </View>
                )}
              </View>
            </FadeIn>
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
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setScannedItem(item);
                  setMrp(
                    item.mrp || item.standard_rate
                      ? String(item.mrp || item.standard_rate)
                      : "",
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
              /* Item Details & Count Form - Redesigned */
              <FadeIn direction="up" delay={0} duration={300}>
                <View style={styles.formSection}>
                  {/* Step 1: Item Identified - Modern Card */}
                  <View style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepNumber}>1</Text>
                      </View>
                      <Text style={styles.stepTitle}>Item Identified</Text>
                      <TouchableOpacity
                        onPress={resetForm}
                        style={styles.closeButton}
                      >
                        <Ionicons
                          name="close"
                          size={20}
                          color={modernColors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemCardModern}>
                      <View style={styles.itemImageContainer}>
                        {scannedItem.image_url ? (
                          <Image
                            source={{ uri: scannedItem.image_url }}
                            style={styles.itemImageLarge}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Ionicons
                              name="cube"
                              size={40}
                              color={modernColors.primary[400]}
                            />
                          </View>
                        )}
                        {existingCountLine && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="#fff"
                            />
                            <Text style={styles.verifiedText}>Counted</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.itemDetails}>
                        <Text style={styles.itemNameLarge} numberOfLines={2}>
                          {getItemDisplayName(scannedItem)}
                        </Text>

                        <View style={styles.itemMetaRow}>
                          <View style={styles.itemMetaChip}>
                            <Ionicons
                              name="barcode-outline"
                              size={14}
                              color={modernColors.primary[500]}
                            />
                            <Text style={styles.itemMetaText}>
                              {scannedItem.barcode || scannedItem.item_code}
                            </Text>
                          </View>
                          <View style={styles.itemMetaChip}>
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color={modernColors.text.tertiary}
                            />
                            <Text style={styles.itemMetaText}>
                              {scannedItem.uom ||
                                scannedItem.uom_name ||
                                "Unit"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.priceRow}>
                          <View style={styles.priceBox}>
                            <Text style={styles.priceLabel}>MRP</Text>
                            <Text style={styles.priceValue}>
                              ₹{scannedItem.mrp || 0}
                            </Text>
                          </View>
                          <View style={styles.priceDivider} />
                          <View style={styles.priceBox}>
                            <Text style={styles.priceLabel}>SP</Text>
                            <Text style={styles.priceValue}>
                              ₹{scannedItem.standard_rate || 0}
                            </Text>
                          </View>
                          <View style={styles.priceDivider} />
                          <View style={styles.priceBox}>
                            <Text style={styles.priceLabel}>Stock</Text>
                            <Text
                              style={[
                                styles.priceValue,
                                { color: modernColors.primary[600] },
                              ]}
                            >
                              {scannedItem.stock_qty || 0}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.categoryRow}>
                          <Ionicons
                            name="folder-outline"
                            size={14}
                            color={modernColors.text.tertiary}
                          />
                          <Text style={styles.categoryText}>
                            {scannedItem.category || "Uncategorized"}{" "}
                            {scannedItem.subcategory
                              ? `• ${scannedItem.subcategory}`
                              : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Step 2: Enter Quantity */}
                  <View style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepBadge,
                          { backgroundColor: modernColors.success.main },
                        ]}
                      >
                        <Text style={styles.stepNumber}>2</Text>
                      </View>
                      <Text style={styles.stepTitle}>Enter Quantity</Text>
                    </View>

                    <View style={styles.quantitySection}>
                      <View style={styles.quantityInputContainer}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          accessibilityLabel="Decrease quantity"
                          testID="btn-decrease-qty"
                          onPress={() =>
                            setQuantity(
                              String(Math.max(0, Number(quantity) - 1)),
                            )
                          }
                        >
                          <Ionicons
                            name="remove"
                            size={28}
                            color={modernColors.text.primary}
                          />
                        </TouchableOpacity>

                        <TextInput
                          style={styles.quantityInput}
                          value={quantity}
                          onChangeText={(text) => {
                            const sanitized = text.replace(/[^0-9.]/g, "");
                            const parts = sanitized.split(".");
                            const normalized =
                              parts.length > 2
                                ? parts[0] + "." + parts.slice(1).join("")
                                : sanitized;
                            setQuantity(normalized);
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={modernColors.text.tertiary}
                          textAlign="center"
                          accessibilityLabel="Quantity"
                          testID="input-quantity"
                        />

                        <TouchableOpacity
                          style={[
                            styles.quantityButton,
                            { backgroundColor: modernColors.primary[500] },
                          ]}
                          accessibilityLabel="Increase quantity"
                          testID="btn-increase-qty"
                          onPress={() =>
                            setQuantity(String(Number(quantity) + 1))
                          }
                        >
                          <Ionicons name="add" size={28} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.quickQuantityRow}>
                        {[1, 5, 10, 25, 50, 100].map((num) => (
                          <TouchableOpacity
                            key={num}
                            style={[
                              styles.quickQuantityChip,
                              quantity === String(num) &&
                                styles.quickQuantityChipActive,
                            ]}
                            onPress={() => setQuantity(String(num))}
                          >
                            <Text
                              style={[
                                styles.quickQuantityText,
                                quantity === String(num) &&
                                  styles.quickQuantityTextActive,
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Step 3: Item Condition */}
                  <View style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View
                        style={[
                          styles.stepBadge,
                          { backgroundColor: modernColors.warning.main },
                        ]}
                      >
                        <Text style={styles.stepNumber}>3</Text>
                      </View>
                      <Text style={styles.stepTitle}>Item Condition</Text>
                      <TouchableOpacity
                        style={styles.selectorButton}
                        onPress={() => setShowConditionModal(true)}
                      >
                        <Text style={styles.selectorText}>
                          {condition || "Good"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={modernColors.text.tertiary}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.conditionRow}>
                      <TouchableOpacity
                        style={[
                          styles.conditionCard,
                          condition === "Good" && styles.conditionCardGood,
                        ]}
                        onPress={() => {
                          setCondition("Good");
                          setIsDamageEnabled(false);
                        }}
                        accessibilityLabel="Set condition Good"
                        testID="btn-condition-good"
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={32}
                          color={
                            condition === "Good"
                              ? modernColors.success.main
                              : modernColors.text.tertiary
                          }
                        />
                        <Text
                          style={[
                            styles.conditionText,
                            condition === "Good" && {
                              color: modernColors.success.main,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          Good
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.conditionCard,
                          condition === "Damage" && styles.conditionCardDamage,
                        ]}
                        onPress={() => {
                          setCondition("Damage");
                          setIsDamageEnabled(true);
                        }}
                        accessibilityLabel="Set condition Damaged"
                        testID="btn-condition-damaged"
                      >
                        <Ionicons
                          name="alert-circle"
                          size={32}
                          color={
                            condition === "Damage"
                              ? modernColors.error.main
                              : modernColors.text.tertiary
                          }
                        />
                        <Text
                          style={[
                            styles.conditionText,
                            condition === "Damage" && {
                              color: modernColors.error.main,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          Damaged
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isDamageEnabled && (
                      <View style={styles.damageDetails}>
                        <View style={styles.damageTypeSelector}>
                          <TouchableOpacity
                            style={[
                              styles.damageTypeOption,
                              damageType === "returnable" &&
                                styles.damageTypeSelected,
                            ]}
                            onPress={() => setDamageType("returnable")}
                            accessibilityLabel="Damage type Returnable"
                            testID="btn-damage-returnable"
                          >
                            <Ionicons
                              name={
                                damageType === "returnable"
                                  ? "radio-button-on"
                                  : "radio-button-off"
                              }
                              size={20}
                              color={
                                damageType === "returnable"
                                  ? modernColors.error.main
                                  : modernColors.text.tertiary
                              }
                            />
                            <Text style={styles.damageTypeText}>
                              Returnable
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.damageTypeOption,
                              damageType === "nonreturnable" &&
                                styles.damageTypeSelected,
                            ]}
                            onPress={() => setDamageType("nonreturnable")}
                            accessibilityLabel="Damage type Non-Returnable"
                            testID="btn-damage-nonreturnable"
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 12,
                              }}
                            >
                              <Text style={styles.inputLabel}>Damage Qty</Text>
                              <TextInput
                                style={[
                                  styles.quantityInput,
                                  { flex: 0, minWidth: 100 },
                                ]}
                                value={damageQty}
                                onChangeText={(text) => {
                                  const sanitized = text.replace(
                                    /[^0-9.]/g,
                                    "",
                                  );
                                  const parts = sanitized.split(".");
                                  const normalized =
                                    parts.length > 2
                                      ? parts[0] + "." + parts.slice(1).join("")
                                      : sanitized;
                                  setDamageQty(normalized);
                                }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={
                                  modernColors.text.tertiary
                                }
                                accessibilityLabel="Damage quantity"
                                testID="input-damage-qty"
                              />
                            </View>
                            <Ionicons
                              name={
                                damageType === "nonreturnable"
                                  ? "radio-button-on"
                                  : "radio-button-off"
                              }
                              size={20}
                              color={
                                damageType === "nonreturnable"
                                  ? modernColors.error.main
                                  : modernColors.text.tertiary
                              }
                            />
                            <Text style={styles.damageTypeText}>
                              Non-Returnable
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.damageRemarkInput}
                          value={damageRemark}
                          onChangeText={setDamageRemark}
                          placeholder="Describe the damage..."
                          placeholderTextColor={modernColors.text.tertiary}
                          multiline
                        />
                      </View>
                    )}
                  </View>

                  {/* Step 4: Additional Details (Collapsible) */}
                  <TouchableOpacity
                    style={styles.collapsibleHeader}
                    onPress={() => setShowFilters(!showFilters)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={[
                          styles.stepBadge,
                          { backgroundColor: modernColors.text.tertiary },
                        ]}
                      >
                        <Ionicons name="options" size={14} color="#fff" />
                      </View>
                      <Text style={styles.collapsibleTitle}>
                        Additional Details
                      </Text>
                      <Text style={styles.optionalTag}>Optional</Text>
                    </View>
                    <Ionicons
                      name={showFilters ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={modernColors.text.tertiary}
                    />
                  </TouchableOpacity>

                  {showFilters && (
                    <View style={styles.additionalDetailsCard}>
                      {/* MRP & Mfg Date */}
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <PremiumInput
                            label="MRP"
                            value={mrp}
                            onChangeText={(text) => {
                              const sanitized = (text || "").replace(
                                /[^0-9.]/g,
                                "",
                              );
                              const parts = sanitized.split(".");
                              const normalized =
                                parts.length > 2
                                  ? parts[0] + "." + parts.slice(1).join("")
                                  : sanitized;
                              setMrp(normalized);
                            }}
                            keyboardType="numeric"
                            placeholder="0.00"
                            leftIcon="pricetag-outline"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <PremiumInput
                            label="Mfg Date"
                            value={mfgDate}
                            onChangeText={setMfgDate}
                            placeholder="YYYY-MM-DD"
                            leftIcon="calendar-outline"
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
                              style={[
                                styles.selectorText,
                                !category && styles.placeholderText,
                              ]}
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
                              style={[
                                styles.selectorText,
                                !subCategory && styles.placeholderText,
                              ]}
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

                      {/* Photo (Optional) */}
                      <View style={styles.photoUploadSection}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text style={styles.inputLabel}>Item Photo</Text>
                          <Text style={styles.optionalTag}>Optional</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.photoUploadButton}
                          onPress={() => {
                            setPhotoType("item");
                            setShowPhotoModal(true);
                          }}
                          accessibilityLabel="Add item photo"
                          testID="btn-add-item-photo"
                        >
                          {itemPhoto ? (
                            <View style={styles.photoPreviewContainer}>
                              <Image
                                source={{ uri: itemPhoto.uri }}
                                style={styles.photoPreviewSmall}
                              />
                              <View style={styles.photoCheckmark}>
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color="#fff"
                                />
                              </View>
                            </View>
                          ) : (
                            <>
                              <Ionicons
                                name="camera-outline"
                                size={24}
                                color={modernColors.primary[500]}
                              />
                              <Text style={styles.photoUploadText}>
                                Add Photo (for later reference)
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: modernColors.text.tertiary,
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          Photo is optional and helps later verification.
                        </Text>
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

                      {/* Location & Verification */}
                      <LocationVerificationSection
                        floorNo={itemState.floorNo}
                        rackNo={itemState.rackNo}
                        onSelectFloor={(f) => updateItemState({ floorNo: f })}
                        onChangeRack={(r) => updateItemState({ rackNo: r })}
                        onClearRecentRacks={handleClearRecentRacks}
                        username={user?.username || "Unknown"}
                        recentRacks={recentRacks}
                      />

                      {/* Serial Number Toggle */}
                      <View
                        style={[
                          styles.serialToggleCard,
                          isSerialEnabled && styles.serialToggleCardActive,
                        ]}
                      >
                        <View style={styles.serialToggleHeader}>
                          <Ionicons
                            name="qr-code"
                            size={20}
                            color={
                              isSerialEnabled
                                ? modernColors.primary[500]
                                : modernColors.text.secondary
                            }
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.serialToggleTitle}>
                              Track Serial Numbers
                            </Text>
                            <Text style={styles.serialToggleSubtitle}>
                              Scan individual serials
                            </Text>
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
                          <View style={styles.serialInputSection}>
                            <View style={styles.serialProgress}>
                              <Text style={styles.serialProgressText}>
                                {serialNumbers.length} / {quantity || 0} scanned
                              </Text>
                              <View style={styles.serialProgressBar}>
                                <View
                                  style={[
                                    styles.serialProgressFill,
                                    {
                                      width: `${Math.min((serialNumbers.length / (Number(quantity) || 1)) * 100, 100)}%`,
                                    },
                                  ]}
                                />
                              </View>
                            </View>

                            <View style={styles.serialInputRow}>
                              <View style={{ flex: 1 }}>
                                <PremiumInput
                                  value={currentSerial}
                                  onChangeText={setCurrentSerial}
                                  placeholder="Scan or enter serial"
                                  rightIcon="add-circle"
                                  onRightIconPress={() => {
                                    if (
                                      currentSerial.trim() &&
                                      !serialNumbers.includes(
                                        currentSerial.trim(),
                                      )
                                    ) {
                                      setSerialNumbers([
                                        ...serialNumbers,
                                        currentSerial.trim(),
                                      ]);
                                      setCurrentSerial("");
                                    }
                                  }}
                                  testID="input-serial"
                                />
                              </View>
                            </View>

                            {serialNumbers.length > 0 && (
                              <View style={styles.serialList}>
                                {serialNumbers.map((sn, index) => (
                                  <View key={index} style={styles.serialChip}>
                                    <Text style={styles.serialChipText}>
                                      {sn}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() =>
                                        setSerialNumbers(
                                          serialNumbers.filter((s) => s !== sn),
                                        )
                                      }
                                      accessibilityLabel={`Remove serial ${sn}`}
                                      testID={`btn-remove-serial-${index}`}
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
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Submit Button */}
                  <View style={styles.submitSection}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={resetForm}
                      accessibilityLabel="Cancel"
                      testID="btn-cancel"
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        (!scannedItem || !quantity || Number(quantity) <= 0) &&
                          styles.submitButtonDisabled,
                      ]}
                      onPress={() => setShowVerificationModal(true)}
                      disabled={
                        !scannedItem ||
                        !quantity ||
                        Number(quantity) <= 0 ||
                        loading
                      }
                      accessibilityLabel="Verify and Submit"
                      testID="btn-verify-submit"
                    >
                      {loading ? (
                        <Text style={styles.submitButtonText}>
                          Submitting...
                        </Text>
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#fff"
                          />
                          <Text style={styles.submitButtonText}>
                            Verify & Submit
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeIn>
            )}

            {isScanning && (
              <View style={styles.scannerOverlay}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={handleScan}
                />
                <View style={styles.scanWindow} />
                <View style={styles.scannerOverlayContent}>
                  <Text style={styles.scannerText}>
                    Align barcode within frame
                  </Text>
                  <TouchableOpacity
                    style={styles.closeScannerButton}
                    onPress={() => setIsScanning(false)}
                  >
                    <Ionicons name="close-circle" size={56} color="#fff" />
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

      {/* Add Quantity Modal */}
      <Modal visible={showAddQuantityModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddQuantityModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Ionicons
                    name="add-circle-outline"
                    size={48}
                    color={modernColors.primary[500]}
                  />
                  <Text style={styles.modalTitle}>Add Quantity</Text>
                </View>

                {scannedItem && existingCountLine && (
                  <View style={styles.addQtyInfo}>
                    <Text style={styles.addQtyItemName}>
                      {getItemDisplayName(scannedItem)}
                    </Text>
                    <Text style={styles.addQtyItemCode}>
                      {scannedItem.item_code}
                    </Text>

                    <View style={styles.addQtyCurrentContainer}>
                      <Text style={styles.addQtyLabel}>Current Count:</Text>
                      <Text style={styles.addQtyValue}>
                        {existingCountLine.counted_qty || 0}{" "}
                        {scannedItem.uom_name || ""}
                      </Text>
                    </View>

                    <View style={styles.addQtyInputContainer}>
                      <Text style={styles.addQtyLabel}>Add Quantity:</Text>
                      <TextInput
                        style={styles.addQtyInput}
                        placeholder="Enter quantity to add"
                        placeholderTextColor={modernColors.text.tertiary}
                        value={additionalQty}
                        onChangeText={(text) => {
                          const sanitized = text.replace(/[^0-9.]/g, "");
                          const parts = sanitized.split(".");
                          const normalized =
                            parts.length > 2
                              ? parts[0] + "." + parts.slice(1).join("")
                              : sanitized;
                          setAdditionalQty(normalized);
                        }}
                        keyboardType="numeric"
                        autoFocus
                        accessibilityLabel="Add quantity"
                        testID="input-additional-qty"
                      />
                    </View>

                    {additionalQty && !isNaN(parseFloat(additionalQty)) && (
                      <View style={styles.addQtyNewTotal}>
                        <Text style={styles.addQtyLabel}>New Total:</Text>
                        <Text style={styles.addQtyTotalValue}>
                          {(
                            (existingCountLine.counted_qty || 0) +
                            parseFloat(additionalQty)
                          ).toFixed(2)}{" "}
                          {scannedItem.uom_name || ""}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <PremiumButton
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setShowAddQuantityModal(false);
                      setAdditionalQty("");
                      resetForm();
                    }}
                    style={{ flex: 1 }}
                  />
                  <PremiumButton
                    title="Add Quantity"
                    onPress={handleAddQuantity}
                    loading={loading}
                    disabled={
                      !additionalQty ||
                      isNaN(parseFloat(additionalQty)) ||
                      parseFloat(additionalQty) <= 0
                    }
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Variance Reason Modal */}
      <Modal visible={showVarianceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Variance Reason Required</Text>
            <Text style={styles.modalSubtitle}>
              Please select a reason for the variance
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {varianceReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.code}
                  style={[
                    styles.reasonOption,
                    itemState.selectedReason === reason.code &&
                      styles.reasonSelected,
                  ]}
                  onPress={() =>
                    updateItemState({ selectedReason: reason.code })
                  }
                >
                  <Text style={styles.reasonText}>
                    {reason.label || reason.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {itemState.selectedReason === "other" && (
              <TextInput
                style={styles.noteInput}
                placeholder="Enter reason"
                placeholderTextColor={modernColors.text.tertiary}
                value={itemState.varianceNote || ""}
                onChangeText={(text) => updateItemState({ varianceNote: text })}
                multiline
              />
            )}

            <View style={styles.modalButtons}>
              <PremiumButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowVarianceModal(false)}
                style={{ flex: 1 }}
                testID="btn-variance-cancel"
              />
              <PremiumButton
                title="Continue"
                onPress={() => {
                  if (itemState.selectedReason) {
                    setShowVarianceModal(false);
                    handleSubmitCount();
                  }
                }}
                disabled={!itemState.selectedReason}
                style={{ flex: 1 }}
                testID="btn-variance-continue"
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* Verification Modal */}
      <Modal visible={showVerificationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={modernColors.primary[500]}
              />
              <Text style={styles.modalTitle}>Verify Details</Text>
              <Text style={styles.modalSubtitle}>
                Please confirm the item details before submitting
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ gap: 16 }}>
                <View style={styles.verificationRow}>
                  <Text style={styles.verificationLabel}>Item Name</Text>
                  <Text
                    style={[
                      styles.verificationValue,
                      { flex: 1, textAlign: "right" },
                    ]}
                  >
                    {getItemDisplayName(scannedItem)}
                  </Text>
                </View>

                <View style={styles.verificationRow}>
                  <Text style={styles.verificationLabel}>Quantity</Text>
                  <Text style={styles.verificationValue}>
                    {quantity} {scannedItem?.uom || scannedItem?.uom_name}
                  </Text>
                </View>

                <View style={styles.verificationRow}>
                  <Text style={styles.verificationLabel}>Condition</Text>
                  <Text
                    style={[
                      styles.verificationValue,
                      {
                        color:
                          condition === "Damage"
                            ? modernColors.error.main
                            : modernColors.success.main,
                      },
                    ]}
                  >
                    {condition || "Good"}
                  </Text>
                </View>

                {isDamageEnabled && (
                  <View style={styles.damageReportBox}>
                    <Text
                      style={{
                        color: modernColors.error.main,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      Damage Report
                    </Text>
                    <Text style={{ color: modernColors.text.primary }}>
                      Type:{" "}
                      {damageType === "nonreturnable"
                        ? "Non-Returnable"
                        : "Returnable"}
                    </Text>
                    {damageRemark ? (
                      <Text
                        style={{
                          color: modernColors.text.secondary,
                          marginTop: 4,
                        }}
                      >
                        &quot;{damageRemark}&quot;
                      </Text>
                    ) : null}
                  </View>
                )}

                {isSerialEnabled && (
                  <View style={styles.serialReportBox}>
                    <Text
                      style={{
                        color: modernColors.primary[700],
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      Serial Numbers ({serialNumbers.length})
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
                    >
                      {serialNumbers.map((s) => (
                        <Text key={s} style={styles.serialTag}>
                          {s}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <PremiumButton
                title="Edit"
                variant="outline"
                onPress={() => setShowVerificationModal(false)}
                style={{ flex: 1 }}
                testID="btn-verification-edit"
              />
              <PremiumButton
                title="Confirm & Submit"
                onPress={() => {
                  setShowVerificationModal(false);
                  handleSubmitCount();
                }}
                loading={loading}
                style={{ flex: 1 }}
                testID="btn-verification-confirm-submit"
              />
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  scanWindow: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 20,
    backgroundColor: "transparent",
    position: "absolute",
    top: "30%",
  },
  scannerText: {
    ...modernTypography.h4,
    color: "#fff",
    marginTop: 40,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    gap: modernSpacing.lg,
  },
  itemCard: {
    marginBottom: modernSpacing.md,
    borderRadius: modernBorderRadius.lg,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.lg,
    borderWidth: 1,
    borderColor: modernColors.primary[100],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.xs,
    backgroundColor: modernColors.background.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: modernBorderRadius.full,
  },
  sessionInfoText: {
    ...modernTypography.body.small,
    color: modernColors.text.primary,
    fontWeight: "600",
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.lg,
  },
  modalContent: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.xl,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  },
  modalTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginTop: modernSpacing.sm,
    textAlign: "center",
  },
  modalSubtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginBottom: modernSpacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginTop: modernSpacing.lg,
  },
  // Add Quantity Modal Styles
  addQtyInfo: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.md,
  },
  addQtyItemName: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: 4,
  },
  addQtyItemCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontFamily: "monospace",
    marginBottom: modernSpacing.md,
  },
  addQtyCurrentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: modernSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  addQtyLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
  addQtyValue: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  },
  addQtyInputContainer: {
    marginTop: modernSpacing.md,
  },
  addQtyInput: {
    backgroundColor: modernColors.background.paper,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderRadius: modernBorderRadius.md,
    paddingHorizontal: modernSpacing.md,
    paddingVertical: 12,
    marginTop: modernSpacing.xs,
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontSize: 18,
    textAlign: "center",
  },
  addQtyNewTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    paddingHorizontal: modernSpacing.md,
    backgroundColor: modernColors.primary[50],
    borderRadius: modernBorderRadius.md,
  },
  addQtyTotalValue: {
    ...modernTypography.h4,
    color: modernColors.primary[600],
  },
  // Variance Modal Styles
  reasonOption: {
    padding: modernSpacing.md,
    borderRadius: modernBorderRadius.md,
    backgroundColor: modernColors.background.elevated,
    marginBottom: modernSpacing.sm,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  reasonSelected: {
    borderColor: modernColors.primary[500],
    backgroundColor: modernColors.primary[50],
  },
  reasonText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  noteInput: {
    backgroundColor: modernColors.background.elevated,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderRadius: modernBorderRadius.md,
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    marginTop: modernSpacing.md,
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    minHeight: 80,
    textAlignVertical: "top",
  },
  // Auto-Layout & Alignment Styles
  detailsCard: {
    gap: 12,
    backgroundColor: modernColors.background.elevated,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    flex: 1,
    borderWidth: 1,
    borderColor: modernColors.border.medium,
    borderRadius: 10,
    backgroundColor: modernColors.background.default,
    justifyContent: "center",
  },
  damageSection: {
    marginTop: 12,
    borderColor: modernColors.error.main,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    backgroundColor: modernColors.error.light + "05",
  },
  damageTypeRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 12,
  },
  damageTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  serialInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  miniCameraButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: modernColors.background.elevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.medium,
    marginTop: 24, // Align with input label offset
  },
  serialPhotoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 10,
    backgroundColor: modernColors.background.default,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  // Verification Modal Styles
  verificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: modernColors.background.elevated,
    borderRadius: 8,
  },
  verificationLabel: {
    color: modernColors.text.secondary,
    fontSize: 14,
  },
  verificationValue: {
    color: modernColors.text.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  damageReportBox: {
    padding: 12,
    backgroundColor: modernColors.error.light + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: modernColors.error.light,
  },
  serialReportBox: {
    padding: 12,
    backgroundColor: modernColors.primary[50],
    borderRadius: 8,
  },
  serialTag: {
    fontSize: 12,
    color: modernColors.text.secondary,
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  // New Step-based UI Styles
  stepCard: {
    backgroundColor: modernColors.background.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: modernColors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: modernColors.background.elevated,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCardModern: {
    flexDirection: "row",
    gap: 16,
  },
  itemImageContainer: {
    position: "relative",
  },
  itemImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: modernColors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    transform: [{ translateX: -32 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: modernColors.success.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  itemDetails: {
    flex: 1,
    gap: 8,
  },
  itemNameLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.text.primary,
    lineHeight: 24,
  },
  itemMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: modernColors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemMetaText: {
    fontSize: 12,
    color: modernColors.text.secondary,
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.background.elevated,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  priceBox: {
    flex: 1,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 10,
    color: modernColors.text.tertiary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: modernColors.text.primary,
    marginTop: 2,
  },
  priceDivider: {
    width: 1,
    height: 24,
    backgroundColor: modernColors.border.light,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    color: modernColors.text.tertiary,
  },
  quantitySection: {
    gap: 16,
  },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: modernColors.background.elevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.medium,
  },
  quantityInput: {
    flex: 1,
    height: 64,
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: modernColors.primary[500],
    fontSize: 32,
    fontWeight: "700",
    color: modernColors.text.primary,
    textAlign: "center",
  },
  quickQuantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickQuantityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: modernColors.background.elevated,
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  quickQuantityChipActive: {
    backgroundColor: modernColors.primary[50],
    borderColor: modernColors.primary[500],
  },
  quickQuantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: modernColors.text.secondary,
  },
  quickQuantityTextActive: {
    color: modernColors.primary[600],
  },
  conditionRow: {
    flexDirection: "row",
    gap: 12,
  },
  conditionCard: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: modernColors.background.elevated,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  conditionCardGood: {
    backgroundColor: modernColors.success.light + "15",
    borderColor: modernColors.success.main,
  },
  conditionCardDamage: {
    backgroundColor: modernColors.error.light + "15",
    borderColor: modernColors.error.main,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: "500",
    color: modernColors.text.secondary,
  },
  damageDetails: {
    marginTop: 16,
    gap: 12,
  },
  damageTypeSelector: {
    flexDirection: "row",
    gap: 16,
  },
  damageTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  damageTypeSelected: {},
  damageTypeText: {
    fontSize: 14,
    color: modernColors.text.primary,
  },
  damageRemarkInput: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: modernColors.text.primary,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: modernColors.error.light,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: "600",
    color: modernColors.text.tertiary,
    backgroundColor: modernColors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  additionalDetailsCard: {
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  photoUploadSection: {
    gap: 8,
  },
  photoUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: modernColors.background.elevated,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderStyle: "dashed",
  },
  photoPreviewContainer: {
    position: "relative",
  },
  photoPreviewSmall: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  photoCheckmark: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: modernColors.success.main,
    justifyContent: "center",
    alignItems: "center",
  },
  photoUploadText: {
    fontSize: 14,
    color: modernColors.primary[500],
    fontWeight: "500",
  },
  serialToggleCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: modernColors.background.elevated,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  serialToggleCardActive: {
    borderColor: modernColors.primary[500],
    backgroundColor: modernColors.primary[50],
  },
  serialToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serialToggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  serialToggleSubtitle: {
    fontSize: 12,
    color: modernColors.text.tertiary,
  },
  serialInputSection: {
    marginTop: 16,
    gap: 12,
  },
  serialProgress: {
    gap: 8,
  },
  serialProgressText: {
    fontSize: 12,
    color: modernColors.text.secondary,
    fontWeight: "500",
  },
  serialProgressBar: {
    height: 4,
    backgroundColor: modernColors.background.default,
    borderRadius: 2,
    overflow: "hidden",
  },
  serialProgressFill: {
    height: "100%",
    backgroundColor: modernColors.primary[500],
    borderRadius: 2,
  },
  submitSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: modernColors.background.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: modernColors.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.text.secondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: modernColors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: modernColors.text.tertiary,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
