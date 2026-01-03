// cspell:ignore springify
/**
 * Scan Screen - Aurora Design v2.0
 *
 * Features:
 * - Floating scan button with pulse animation
 * - Aurora background
 * - Quick actions menu
 * - Recent items carousel
 * - Smart search with suggestions
 * - Offline queue indicator
 * - Haptic feedback
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useDebounce } from "use-debounce";
import { useAuthStore } from "@/store/authStore";
import { useScanSessionStore } from "@/store/scanSessionStore";
import {
  ScreenContainer,
  GlassCard,
  FloatingScanButton,
  ScanFeedback,
  SyncStatusPill,
} from "@/components/ui";
import type { ScanFeedbackType } from "@/components/ui";
import { theme } from "@/styles/modernDesignSystem";
import {
  colors as unifiedColors,
  radius,
  spacing,
} from "@/theme/unified";
import { useThemeContext } from "@/context/ThemeContext";
import {
  getItemByBarcode,
  searchItems,
  updateSessionStatus,
  checkItemScanStatus,
} from "@/services/api/api";
import { scanDeduplicationService } from "@/domains/inventory/services/scanDeduplicationService";
import { RecentItemsService } from "@/services/enhancedFeatures";
import { searchItemsSemantic, identifyItem } from "@/services/api/api";
import { hapticService } from "@/services/hapticService";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toastService } from "@/services/utils/toastService";
import { localDb } from "@/db/localDb";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { validateBarcode } from "@/utils/validation";

export default function ScanScreen() {
  const { themeLegacy: appTheme, isDark } = useThemeContext();
  const { colors } = appTheme;
  const { width } = useWindowDimensions();
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId)
    ? rawSessionId[0]
    : rawSessionId;
  const router = useRouter();
  const { user: _user, logout } = useAuthStore();
  const { sessionType, currentFloor, currentRack } = useScanSessionStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Multi-read validation for accurate scanning
  const scanBufferRef = useRef<
    { code: string; count: number; timestamp: number }[]
  >([]);
  const SCAN_CONFIDENCE_THRESHOLD = 2; // Require 2 consistent reads
  const SCAN_BUFFER_TIMEOUT = 1500; // Clear buffer after 1.5s of no scans
  const SCAN_BUFFER_MAX_SIZE = 5; // Keep last 5 reads

  // States
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [_searchMethod, setSearchMethod] = useState<"standard" | "semantic">(
    "standard",
  );
  const [scanned, setScanned] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);

  const [loading, setLoading] = useState(false);

  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Scan feedback state
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [scanFeedbackType, setScanFeedbackType] =
    useState<ScanFeedbackType>("success");

  // Real-time updates via WebSocket
  const { lastMessage } = useWebSocket(sessionId);

  useEffect(() => {
    if (lastMessage && lastMessage.type === "ITEM_VERIFIED") {
      __DEV__ && console.log("[ScanScreen] Real-time update received:", lastMessage);
      toastService.show(
        `Item ${lastMessage.item_code} verified by ${lastMessage.user}`,
        "info",
      );
      // Optionally refresh recent items or search results if they contain this item
      loadRecentItems();
    }
  }, [lastMessage]);
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState("");

  // Animation
  const quickActionsScale = useSharedValue(0);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const screenHeader = React.useMemo(() => ({
    title: "Scan Items",
    subtitle:
      sessionType !== "STANDARD"
        ? `Session: ${sessionId || "None"} • ${sessionType}`
        : `Session: ${sessionId || "None"}`,
    showBackButton: true,
    showUsername: false,
    showLogoutButton: true,
    customRightContent: <SyncStatusPill />,
  }), [sessionType, sessionId]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setSearchMethod("standard");
    try {
      const results = await searchItems(query);
      console.log("Search results for:", query, results);
      setSearchResults(results);
      setShowResults(true);
    } catch (_error) {
      console.error("Search error:", _error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSemanticSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    setIsAISearching(true);
    try {
      const results = await searchItemsSemantic(searchQuery);
      if (results.length > 0) {
        setSearchResults(results);
        setSearchMethod("semantic");
        setShowResults(true);
        hapticService.scanSuccess();
      } else {
        toastService.show("No semantic matches found for your query", {
          type: "info",
        });
      }
    } catch {
      toastService.show("Failed to perform semantic search", { type: "error" });
    } finally {
      setIsAISearching(false);
    }
  };

  const handleVisualSearch = async () => {
    if (!cameraRef.current) return;

    if (!isCameraReady) {
      toastService.show("Camera is initializing, please wait...", {
        type: "info",
      });
      return;
    }

    try {
      setIsAISearching(true);
      // Take a picture for identification
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });

      if (photo && photo.uri) {
        setLoading(true);
        const results = await identifyItem(photo.uri);

        if (results.length > 0) {
          setSearchResults(results);
          setSearchMethod("semantic");
          setShowResults(true);
          setIsScanning(false);
          setSearchQuery(""); // Clear text search when using visual
          hapticService.scanSuccess();
        } else {
          toastService.show(
            "Could not identify the item. Please try a different angle or manual search.",
            { type: "warning" },
          );
        }
      }
    } catch (error) {
      console.error("Visual search error:", error);
      toastService.show("Failed to process image for identification", {
        type: "error",
      });
    } finally {
      setIsAISearching(false);
      setLoading(false);
    }
  };

  // Effect for live search
  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchQuery, handleSearch]);

  const loadRecentItems = async () => {
    try {
      const recent = await RecentItemsService.getRecent();
      setRecentItems(recent.slice(0, 5)); // Get first 5 items
    } catch (error) {
      console.error("Failed to load recent items:", error);
    }
  };

  const quickActionsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: quickActionsScale.value }],
    opacity: quickActionsScale.value,
  }));

  const toggleQuickActions = () => {
    hapticService.impact("medium");

    if (showQuickActions) {
      quickActionsScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => setShowQuickActions(false), 200);
    } else {
      setShowQuickActions(true);
      quickActionsScale.value = withSpring(1);
    }
  };

  const handleScanPress = async () => {
    hapticService.impact("heavy");

    if (!permission) {
      // Permissions are still loading
      return;
    }

    if (!permission.granted) {
      if (permission.canAskAgain) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            "Permission Required",
            "Camera permission is needed to scan items.",
            [{ text: "OK" }],
          );
          return;
        }
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable camera permission in your device settings to scan items.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    setScanned(false); // Reset scanned state when opening camera
    scanBufferRef.current = []; // Clear scan buffer for fresh start
    setIsScanning(true);
    setIsCameraReady(false); // Reset ready state
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned) return; // Prevent multiple scans

    const now = Date.now();
    const trimmedData = data.trim();

    // Clean old entries from buffer (older than timeout)
    scanBufferRef.current = scanBufferRef.current.filter(
      (entry) => now - entry.timestamp < SCAN_BUFFER_TIMEOUT,
    );

    // Find existing entry for this barcode
    const existingIndex = scanBufferRef.current.findIndex(
      (entry) => entry.code === trimmedData,
    );

    if (existingIndex >= 0 && scanBufferRef.current[existingIndex]) {
      // Increment count for existing barcode
      scanBufferRef.current[existingIndex]!.count += 1;
      scanBufferRef.current[existingIndex]!.timestamp = now;
    } else {
      // Add new barcode to buffer
      scanBufferRef.current.push({
        code: trimmedData,
        count: 1,
        timestamp: now,
      });

      // Keep buffer size manageable
      if (scanBufferRef.current.length > SCAN_BUFFER_MAX_SIZE) {
        scanBufferRef.current.shift();
      }
    }

    // Find the barcode with highest confidence (most reads)
    const confident = scanBufferRef.current.find(
      (entry) => entry.count >= SCAN_CONFIDENCE_THRESHOLD,
    );

    // Only proceed if we have confident read
    if (!confident) {
      // Light haptic to indicate scan detected but not yet confirmed
      hapticService.impact("light");
      return;
    }

    // We have a confident scan - proceed
    setScanned(true);
    scanBufferRef.current = []; // Clear buffer after successful scan

    hapticService.scanSuccess();

    // Deduplication check
    const { isDuplicate } = scanDeduplicationService.checkDuplicate(
      confident.code,
    );
    if (isDuplicate) {
      hapticService.notification("warning");
      // Show visual feedback for duplicate
      setScanFeedbackType("duplicate");
      setScanFeedbackMessage("This item was recently scanned");
      setShowScanFeedback(true);
    }

    setIsScanning(false);
    await handleLookup(confident.code);
  };

  const handleLookup = async (barcode: string) => {
    // Validate barcode with detailed error message
    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      hapticService.scanError();
      // Show user-friendly error in scan feedback
      setScanFeedbackType("error");
      setScanFeedbackMessage(validation.error || "Invalid barcode");
      setShowScanFeedback(true);
      return;
    }

    const sanitized = validation.value!;
    setLoading(true);
    // Don't clear searchQuery here - wait until successful navigation
    setShowResults(false); // Hide results

    try {
      let item: any;
      try {
        // Always use the API layer lookup: it already handles offline cache fallback.
        item = await getItemByBarcode(sanitized);
      } catch (e) {
        // As a last resort, try sqlite local DB (if present).
        try {
          __DEV__ && console.log("Lookup failed, trying local DB fallback...");
          item = await localDb.getItemByBarcode(sanitized);
        } catch {
          throw e;
        }
      }

      if (item) {
        hapticService.scanSuccess();

        // Show success feedback
        setScanFeedbackType("success");
        setScanFeedbackMessage(`Found: ${item.item_name || item.item_code}`);
        setShowScanFeedback(true);

        // Track recent
        __DEV__ && console.log("Adding to recent items service...");
        try {
          await RecentItemsService.addRecent(item.item_code, item);
          __DEV__ && console.log("Added to recent items.");
        } catch (e) {
          console.error("Failed to add recent item:", e);
        }
        await loadRecentItems();

        // Navigation logic encapsulated
        const proceedToDetail = () => {
          const navigationBarcode = item.barcode || sanitized;
          setSearchQuery("");
          router.push({
            pathname: "/staff/item-detail",
            params: {
              barcode: navigationBarcode,
              sessionId: sessionId as string,
            },
          } as any);
        };

        // Check for duplicate scans
        try {
          const scanStatus = await checkItemScanStatus(
            sessionId as string,
            item.item_code
          );

          if (scanStatus.scanned) {
            // Check if scanned in current location
            const duplicateInLocation = scanStatus.locations.find(
              (loc) =>
                loc.floor_no === currentFloor && loc.rack_no === currentRack
            );

            if (duplicateInLocation) {
              // Alert user - Duplicate in SAME location
              hapticService.notification("warning");
              Alert.alert(
                "Duplicate Scan",
                `This item was already counted in THIS location (${currentFloor} - ${currentRack}) by ${duplicateInLocation.counted_by}.\n\nCounted Qty: ${duplicateInLocation.counted_qty}\n\nDo you want to verify/update?`,
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => {
                      setLoading(false);
                      setSearchQuery("");
                    },
                  },
                  {
                    text: "Verify / Update",
                    onPress: proceedToDetail,
                  },
                ]
              );
              return; // Stop execution, wait for user choice
            } else {
              // Item exists but in DIFFERENT location
              // Show toast info
              toastService.show(
                `Item found in ${scanStatus.locations.length} other location(s). Total Qty: ${scanStatus.total_qty}`,
                { type: "info", duration: "long" }
              );
            }
          }
        } catch (error) {
          console.error("Failed to check scan status:", error);
          // Continue even if check fails
        }

        proceedToDetail();
      } else {
        hapticService.scanError();
        // Show error feedback
        setScanFeedbackType("error");
        setScanFeedbackMessage(`Item not found: ${barcode}`);
        setShowScanFeedback(true);
      }
    } catch (error: any) {
      hapticService.scanError();
      // Prefer inline feedback instead of a modal to avoid interrupting scanning.
      setScanFeedbackType("error");
      setScanFeedbackMessage(error?.message || "Failed to lookup item");
      setShowScanFeedback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (searchQuery.trim()) {
      // Only trigger direct lookup if it looks like a barcode (starts with 51, 52, 53)
      // Otherwise, just let the search results stay (don't auto-select)
      if (
        searchQuery.startsWith("51") ||
        searchQuery.startsWith("52") ||
        searchQuery.startsWith("53")
      ) {
        handleLookup(searchQuery);
      } else {
        // Ensure results are shown (they should be from debounce)
        Keyboard.dismiss();
      }
    }
  };

  const handleSearchResultPress = async (item: any) => {

    const code = item.barcode || item.item_code;
    __DEV__ && console.log("Using code for lookup:", code);

    if (!code) return;
    // Keep results visible until lookup finishes to avoid layout jump at the bottom
    await handleLookup(code);
    requestAnimationFrame(() => setShowResults(false));
  };

  const handleRecentItemPress = (item: any) => {
    const code = item.barcode || item.item_code;
    if (code) {
      handleLookup(code);
    }
  };

  const _handleLogout = () => {
    hapticService.impact("medium");
    setShowLogoutModal(true);
  };

  const [isFinishing, setIsFinishing] = useState(false);

  const confirmFinishRack = async () => {
    if (!sessionId) return;

    setIsFinishing(true);
    try {
      await updateSessionStatus(sessionId, "closed");
      hapticService.notification("success");
      toastService.show("Rack marked as complete!", { type: "success" });
      router.replace("/staff/home");
    } catch (error: any) {
      console.error("Failed to finish rack:", error);
      toastService.show(error.message || "Failed to close session", {
        type: "error",
      });
    } finally {
      setIsFinishing(false);
      setShowCloseSessionModal(false);
    }
  };

  const handleFinishRack = () => {
    hapticService.impact("medium");
    if (!sessionId) {
      toastService.show("No active session to close", { type: "error" });
      return;
    }
    setShowCloseSessionModal(true);
  };

  if (isScanning) {
    return (
      <View style={styles.cameraFullScreen}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          onCameraReady={() => {
            __DEV__ && console.log("Camera is ready");
            setIsCameraReady(true);
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: [
              // 1D Barcodes - Full support
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "code93",
              "codabar",
              "itf14",
              // 2D Codes
              "qr",
            ],
          }}
        >
          {/* AR-style overlay */}
          <View style={styles.cameraOverlay}>
            <View
              style={[
                styles.scanFrame,
                { width: width * 0.7, height: width * 0.7 },
              ]}
            >
              <View
                style={[
                  styles.corner,
                  styles.cornerTopLeft,
                  { borderColor: colors.accent },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerTopRight,
                  { borderColor: colors.accent },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomLeft,
                  { borderColor: colors.accent },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomRight,
                  { borderColor: colors.accent },
                ]}
              />
            </View>

            <Text style={[styles.scanInstructions, { color: unifiedColors.white }]}>
              Position barcode within the frame
            </Text>

            {/* Visual Identification Button */}
            <TouchableOpacity
              style={styles.photoIdentifyButton}
              onPress={handleVisualSearch}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(14, 165, 233, 0.8)", "rgba(2, 132, 199, 0.9)"]}
                style={styles.photoIdentifyGradient}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.photoIdentifyText}>Identify Item (AI)</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(15, 23, 42, 0.8)", "rgba(2, 6, 23, 0.9)"]}
                style={styles.cancelButtonGradient}
              >
                <Ionicons name="close" size={24} color="#FFF" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }



  return (
    <ScreenContainer
      header={screenHeader}
      backgroundType="aurora"
      auroraVariant="primary"
      auroraIntensity="medium"
      contentMode="static"
      noPadding
      statusBarStyle="light"
      overlay={
        <>
          <OfflineIndicator />
          <ScanFeedback
            visible={showScanFeedback}
            type={scanFeedbackType}
            title={scanFeedbackMessage}
            onDismiss={() => setShowScanFeedback(false)}
            duration={2000}
          />
        </>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Section Info */}
        {(currentFloor || currentRack) && (
          <GlassCard
            variant="light"
            intensity={15}
            elevation="sm"
            style={{
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 16
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2, fontWeight: '500' }}>
                Current Section
              </Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {currentFloor} {currentRack ? `• ${currentRack}` : ''}
              </Text>
            </View>
          </GlassCard>
        )}
        {/* Search Card - Replaced GlassCard with View to fix focus loss */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Ionicons
              name="search"
              size={22}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontSize: 16 }]}
              placeholder="Search item or scan barcode..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleManualSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
              keyboardType="default"
            />
            <View style={styles.searchActions}>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowResults(false);
                  setSearchMethod("standard");
                }}
                style={[styles.clearButton, { opacity: searchQuery.length > 0 ? 1 : 0 }]}
                disabled={searchQuery.length === 0}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
              <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 8 }} />
              <TouchableOpacity
                onPress={() => setIsScanning(true)}
                style={[styles.aiButton, { backgroundColor: colors.accent + '15', padding: 8, borderRadius: 8 }]}
              >
                <Ionicons
                  name="scan-outline"
                  size={22}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Live Search Results */}
        {showResults && (
          <View
            style={[
              styles.searchResultsContainer,
              { borderTopColor: 'transparent', marginTop: 0 },
            ]}
          >
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={{ padding: 20 }}
              />
            ) : searchResults.length > 0 ? (
              <ScrollView
                style={styles.resultsList}
                contentContainerStyle={[styles.resultsListContent, { paddingHorizontal: 4 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.barcode || item.item_code || item.id}-${index}`}
                    style={[
                      styles.resultItem,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                        padding: 12,
                      },
                    ]}
                    onPress={() => handleSearchResultPress(item)}
                  >
                    <View
                      style={[
                        styles.resultIcon,
                        { backgroundColor: colors.surfaceElevated },
                      ]}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text
                        style={[styles.resultName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.item_name || item.name}
                      </Text>
                      <View style={styles.resultCodeRow}>
                        <Text
                          style={[
                            styles.resultCode,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.barcode || item.item_code || "—"}
                        </Text>
                        {item.mrp != null && item.mrp > 0 && (
                          <View
                            style={[
                              styles.mrpBadge,
                              {
                                backgroundColor: colors.warning + "15",
                                borderColor: colors.warning + "30",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.mrpBadgeText,
                                { color: colors.warning },
                              ]}
                            >
                              ₹{item.mrp}
                            </Text>
                          </View>
                        )}
                        {item.batch_id && (
                          <View
                            style={[
                              styles.batchBadge,
                              {
                                backgroundColor: colors.accent + "10",
                                borderColor: colors.accent + "20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.batchBadgeText,
                                { color: colors.accent },
                              ]}
                            >
                              Batch: {item.batch_id}
                            </Text>
                          </View>
                        )}
                      </View>
                      {(item.manual_barcode ||
                        item.unit2_barcode ||
                        item.unit_m_barcode) && (
                          <View style={styles.altBarcodesRow}>
                            {item.manual_barcode && (
                              <View
                                style={[
                                  styles.otherBarcodeBadge,
                                  {
                                    backgroundColor: colors.success + "10",
                                    borderColor: colors.success + "20",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.otherBarcodeText,
                                    { color: colors.success },
                                  ]}
                                >
                                  Manual: {item.manual_barcode}
                                </Text>
                              </View>
                            )}
                            {item.unit2_barcode && (
                              <View
                                style={[
                                  styles.otherBarcodeBadge,
                                  {
                                    backgroundColor: colors.success + "10",
                                    borderColor: colors.success + "20",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.otherBarcodeText,
                                    { color: colors.success },
                                  ]}
                                >
                                  Unit2: {item.unit2_barcode}
                                </Text>
                              </View>
                            )}
                            {item.unit_m_barcode && (
                              <View
                                style={[
                                  styles.otherBarcodeBadge,
                                  {
                                    backgroundColor: colors.success + "10",
                                    borderColor: colors.success + "20",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.otherBarcodeText,
                                    { color: colors.success },
                                  ]}
                                >
                                  UnitM: {item.unit_m_barcode}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              debouncedSearchQuery.length >= 2 && (
                <View style={styles.semanticSearchContainer}>
                  <Text
                    style={[
                      styles.noResultsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No direct matches found
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.semanticSearchButton,
                      {
                        borderColor: colors.accent + "30",
                        backgroundColor: colors.accent + "05",
                      },
                    ]}
                    onPress={handleSemanticSearch}
                    disabled={isAISearching}
                  >
                    {isAISearching ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.accent}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="sparkles-outline"
                          size={16}
                          color={colors.accent}
                        />
                        <Text
                          style={[
                            styles.semanticSearchText,
                            { color: colors.accent },
                          ]}
                        >
                          Search by meaning (AI)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        )}

        {/* Empty State */}
        {!showResults && recentItems.length === 0 && !searchQuery && (
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
              opacity: 0.8
            }}
          >
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4
            }}>
              <Ionicons name="scan-circle-outline" size={48} color={colors.accent} />
            </View>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 8
            }}>
              Ready to Scan
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: 250
            }}>
              Use the camera or type above to find items in the inventory.
            </Text>
          </Animated.View>
        )}

        {/* Recent Items */}
        {
          recentItems.length > 0 && (
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Items
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentItemsContainer}
              >
                {recentItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleRecentItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <GlassCard
                      variant="light"
                      intensity={15}
                      elevation="sm"
                      padding={16}
                      style={styles.recentItemCard}
                    >
                      <View
                        style={[
                          styles.recentItemIcon,
                          { backgroundColor: colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="cube-outline"
                          size={24}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.resultCodeRow}>
                        <Text
                          style={[
                            styles.recentItemCode,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.item_code}
                        </Text>
                        {item.batch_id && (
                          <View
                            style={[
                              styles.batchBadge,
                              {
                                backgroundColor: colors.accent + "10",
                                borderColor: colors.accent + "20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.batchBadgeText,
                                { color: colors.accent },
                              ]}
                            >
                              B
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.recentItemName, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {item.item_name || "Unknown Item"}
                      </Text>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )
        }

        {/* Stats Card */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <GlassCard
            variant="medium"
            intensity={20}
            elevation="md"
            style={styles.statsCard}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Today&apos;s Progress
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  0
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Scanned
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  0
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Verified
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  0
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Pending
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Finish Rack Button */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <TouchableOpacity
            style={[
              styles.finishRackButton,
              isFinishing && styles.finishRackButtonDisabled,
            ]}
            onPress={handleFinishRack}
            disabled={isFinishing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={appTheme.gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.finishRackGradient}
            >
              {isFinishing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                  <Text style={styles.finishRackText}>Finish Rack</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Spacing for floating button */}
        <View style={{ height: 120 }} />
      </ScrollView >

      {/* Floating Scan Button */}
      < View style={styles.floatingButtonContainer} >
        <FloatingScanButton onPress={handleScanPress} disabled={loading} />
      </View >

      {/* Quick Actions Menu */}
      {
        showQuickActions && (
          <Animated.View
            style={[styles.quickActionsContainer, quickActionsStyle]}
          >
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={appTheme.gradients.accent}
                style={styles.quickActionGradient}
              >
                <Ionicons name="list" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={appTheme.gradients.success}
                style={styles.quickActionGradient}
              >
                <Ionicons name="checkmark-done" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                Verify
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )
      }

      {/* Quick Actions Toggle */}
      <TouchableOpacity
        style={styles.quickActionsToggle}
        onPress={toggleQuickActions}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={appTheme.gradients.accent}
          style={styles.quickActionsToggleGradient}
        >
          <Ionicons
            name={showQuickActions ? "close" : "apps"}
            size={24}
            color="#FFF"
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* Logout Confirmation Modal */}
      {/* @ts-ignore */}
      <Modal
        isVisible={showLogoutModal}
        onBackdropPress={() => setShowLogoutModal(false)}
        onBackButtonPress={() => setShowLogoutModal(false)}
        style={{ margin: 0, justifyContent: "center", padding: 20 }}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
        useNativeDriver
        hideModalContentWhileAnimating
        statusBarTranslucent
      >
        <View
          style={{
            backgroundColor: isDark ? unifiedColors.neutral[800] : unifiedColors.white,
            borderRadius: radius.xl,
            padding: spacing['2xl'],
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.full,
              backgroundColor: `${unifiedColors.error[500]}20`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="log-out" size={32} color={unifiedColors.error[500]} />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: isDark ? unifiedColors.neutral[50] : unifiedColors.neutral[900],
              marginBottom: spacing.sm,
              textAlign: "center",
            }}
          >
            Log Out
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: isDark ? unifiedColors.neutral[400] : unifiedColors.neutral[500],
              textAlign: "center",
              marginBottom: spacing['2xl'],
              lineHeight: 22,
            }}
          >
            Are you sure you want to log out?{"\n"}Any unsaved progress will be
            lost.
          </Text>

          <View style={{ flexDirection: "row", gap: spacing.md, width: "100%" }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: isDark ? unifiedColors.neutral[700] : unifiedColors.neutral[100],
                alignItems: "center",
              }}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: isDark ? unifiedColors.neutral[50] : unifiedColors.neutral[900],
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: unifiedColors.error[500],
                alignItems: "center",
              }}
              onPress={() => {
                setShowLogoutModal(false);
                logout();
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: unifiedColors.white,
                }}
              >
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Close Session Confirmation Modal */}
      {/* @ts-ignore */}
      <Modal
        isVisible={showCloseSessionModal}
        onBackdropPress={() => setShowCloseSessionModal(false)}
        onBackButtonPress={() => setShowCloseSessionModal(false)}
        style={{ margin: 0, justifyContent: "center", padding: 20 }}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
        useNativeDriver
        hideModalContentWhileAnimating
        statusBarTranslucent
      >
        <View
          style={{
            backgroundColor: isDark ? unifiedColors.neutral[800] : unifiedColors.white,
            borderRadius: radius.xl,
            padding: spacing['2xl'],
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.full,
              backgroundColor: `${unifiedColors.success[500]}20`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="checkmark-circle" size={32} color={unifiedColors.success[500]} />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: isDark ? unifiedColors.neutral[50] : unifiedColors.neutral[900],
              marginBottom: spacing.sm,
              textAlign: "center",
            }}
          >
            Finish Rack
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: isDark ? unifiedColors.neutral[400] : unifiedColors.neutral[500],
              textAlign: "center",
              marginBottom: spacing['2xl'],
              lineHeight: 22,
            }}
          >
            Are you sure you want to mark this rack as complete?{"\n"}You won't
            be able to add more items to this section.
          </Text>

          <View style={{ flexDirection: "row", gap: spacing.md, width: "100%" }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: isDark ? unifiedColors.neutral[700] : unifiedColors.neutral[100],
                alignItems: "center",
              }}
              onPress={() => setShowCloseSessionModal(false)}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: isDark ? unifiedColors.neutral[50] : unifiedColors.neutral[900],
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: unifiedColors.success[500],
                alignItems: "center",
              }}
              onPress={confirmFinishRack}
              disabled={isFinishing}
            >
              {isFinishing ? (
                <ActivityIndicator color={unifiedColors.white} />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: unifiedColors.white,
                  }}
                >
                  Finish Rack
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
    fontWeight: "500",
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeBlind: {
    backgroundColor: unifiedColors.warning[500],
  },
  modeBadgeStrict: {
    backgroundColor: unifiedColors.error[500],
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchCard: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  clearButton: {
    padding: 4,
  },
  searchActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.gradients.shimmer[0],
  },
  semanticSearchContainer: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  semanticSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.gradients.shimmer[0],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  semanticSearchText: {
    color: theme.colors.primary[500],
    fontSize: 12,
    fontWeight: "600",
  },
  photoIdentifyButton: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
  photoIdentifyGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  photoIdentifyText: {
    color: theme.colors.text.inverse,
    fontSize: 15,
    fontWeight: "600",
  },
  // Search Results Styles
  searchResultsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingTop: 5,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultsListContent: {
    paddingBottom: 4,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.gradients.shimmer[0],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: theme.colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  resultCode: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    fontWeight: "500",
  },
  noResultsText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    textAlign: "center",
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.3,
    paddingHorizontal: 4,
  },
  recentItemsContainer: {
    paddingBottom: 20,
    gap: 12,
    paddingHorizontal: 4,
  },
  recentItemCard: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  recentItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  recentItemCode: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  recentItemName: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: "center",
    fontWeight: "500",
  },
  statsCard: {
    marginTop: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: unifiedColors.primary[400],
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
  },
  quickActionsContainer: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    flexDirection: "row",
    gap: 14,
  },
  quickActionButton: {
    alignItems: "center",
    gap: 4,
  },
  quickActionGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quickActionLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  quickActionsToggle: {
    position: "absolute",
    bottom: 32,
    right: 24,
  },
  quickActionsToggleGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Camera styles
  cameraFullScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: unifiedColors.primary[400],
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanInstructions: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: 32,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  cancelButton: {
    position: "absolute",
    bottom: 60,
    borderRadius: 30,
    overflow: "hidden",
  },
  cancelButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  // Finish Rack Button Styles
  finishRackButton: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  finishRackButtonDisabled: {
    opacity: 0.7,
  },
  finishRackGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  finishRackText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  resultCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  batchBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
  },
  batchBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: unifiedColors.primary[400],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mrpBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  mrpBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: unifiedColors.warning[500],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  altBarcodesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  otherBarcodeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  otherBarcodeText: {
    fontSize: 9,
    fontWeight: "700",
    color: unifiedColors.success[500],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
