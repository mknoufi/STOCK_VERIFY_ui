/**
 * Modern Scan Screen - Lavanya Mart Stock Verify
 * Clean, efficient scanning interface
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDebounce } from "use-debounce";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import {
  getItemByBarcode,
  searchItems,
  updateSessionStatus,
  checkItemScanStatus,
  getSessionStats,
} from "../../src/services/api/api";
import { RecentItemsService } from "../../src/services/enhancedFeatures";
import { toastService } from "../../src/services/utils/toastService";
import { localDb } from "../../src/db/localDb";
import { validateBarcode } from "../../src/utils/validation";
import { SCANNER_CONFIG } from "../../src/config/scannerConfig";

import ModernHeader from "../../src/components/ui/ModernHeader";
import ModernCard from "../../src/components/ui/ModernCard";
import ModernButton from "../../src/components/ui/ModernButton";
import ModernInput from "../../src/components/ui/ModernInput";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../src/theme/modernDesign";

const SCAN_BUFFER_TIMEOUT = 2000; // 2 seconds
const SCAN_CONFIDENCE_THRESHOLD = 2;

export default function ScanScreen() {
  const router = useRouter();
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId)
    ? rawSessionId[0]
    : rawSessionId;

  const { currentFloor, currentRack } = useScanSessionStore();
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessionStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const stats = await getSessionStats(sessionId);
      if (stats) {
        setSessionStats(stats);
      }
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  }, [sessionId]);

  const loadRecentItems = useCallback(async () => {
    try {
      const items = await RecentItemsService.getRecentItems();
      setRecentItems(items);
    } catch (error) {
      console.error("Failed to load recent items", error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    await Promise.all([loadRecentItems(), loadSessionStats()]);
    setInitialLoading(false);
  }, [loadRecentItems, loadSessionStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  // Search effect
  useEffect(() => {
    const runSearch = async () => {
      if (debouncedSearchQuery.trim().length > 2) {
        await performSearch(debouncedSearchQuery);
      } else {
        setSearchResults([]);
      }
    };
    runSearch();
  }, [debouncedSearchQuery]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState({
    scannedItems: 0,
    verifiedItems: 0,
    pendingItems: 0,
    totalItems: 0,
  });
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Animation values for scan frame
  const scanLinePosition = useSharedValue(0);
  const cornerOpacity = useSharedValue(1);

  const scanBufferRef = useRef<
    { code: string; count: number; timestamp: number }[]
  >([]);

  // Animated scan line
  useEffect(() => {
    if (isScanning) {
      scanLinePosition.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      cornerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
        false,
      );
    }
  }, [isScanning, scanLinePosition, cornerOpacity]);

  const animatedScanLine = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value * 200 }],
  }));

  const animatedCorners = useAnimatedStyle(() => ({
    opacity: cornerOpacity.value,
  }));

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [sessionId, loadInitialData]);

  // Reload stats when screen gains focus (user navigates back from item-detail)
  useFocusEffect(
    useCallback(() => {
      loadSessionStats();
    }, [loadSessionStats]),
  );

  const performSearch = async (query: string) => {
    try {
      const results = await searchItems(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned) return;

    const now = Date.now();
    const trimmedData = data.trim();

    // Buffer logic
    scanBufferRef.current = scanBufferRef.current.filter(
      (entry) => now - entry.timestamp < SCAN_BUFFER_TIMEOUT,
    );

    const existingIndex = scanBufferRef.current.findIndex(
      (entry) => entry.code === trimmedData,
    );

    if (existingIndex >= 0) {
      scanBufferRef.current[existingIndex]!.count += 1;
      scanBufferRef.current[existingIndex]!.timestamp = now;
    } else {
      scanBufferRef.current.push({
        code: trimmedData,
        count: 1,
        timestamp: now,
      });
    }

    const confident = scanBufferRef.current.find(
      (entry) => entry.count >= SCAN_CONFIDENCE_THRESHOLD,
    );

    if (!confident) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    setScanned(true);
    scanBufferRef.current = [];
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsScanning(false);

    await handleLookup(confident.code);
  };

  const handleLookup = async (barcode: string) => {
    if (loading) return;
    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      Alert.alert("Invalid Barcode", validation.error || "Please try again");
      setScanned(false);
      return;
    }

    setLoading(true);
    try {
      let item: any;
      try {
        item = await getItemByBarcode(validation.value!);
      } catch (e) {
        try {
          item = await localDb.getItemByBarcode(validation.value!);
        } catch {
          throw e;
        }
      }

      if (item) {
        await RecentItemsService.addRecent(item.item_code, item);
        await loadRecentItems();

        // Check for duplicates
        try {
          const scanStatus = await checkItemScanStatus(
            sessionId!,
            item.item_code,
          );
          if (scanStatus.scanned) {
            const duplicateInLocation = scanStatus.locations.find(
              (loc: any) =>
                loc.floor_no === currentFloor && loc.rack_no === currentRack,
            );

            if (duplicateInLocation) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              setLoading(false);
              setScanned(false);
              Alert.alert(
                "Duplicate Scan",
                `Item already counted here by ${duplicateInLocation.counted_by}.\nQty: ${duplicateInLocation.counted_qty}`,
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Verify / Update",
                    onPress: () =>
                      navigateToDetail(item.barcode || validation.value!),
                  },
                ],
              );
              return;
            } else {
              toastService.show(
                `Item found in ${scanStatus.locations.length} other location(s)`,
                {
                  type: "info",
                },
              );
            }
          }
        } catch {
          // Ignore check status error
        }

        navigateToDetail(item.barcode || validation.value!);
      } else {
        Alert.alert("Not Found", "Item not found in database");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to lookup item");
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  const navigateToDetail = (barcode: string) => {
    setSearchQuery("");
    router.push({
      pathname: "/staff/item-detail",
      params: { barcode, sessionId: sessionId! },
    } as any);
  };

  const handleFinishRack = async () => {
    if (!sessionId) return;
    setIsFinishing(true);
    try {
      await updateSessionStatus(sessionId, "CLOSED");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/staff/home");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to close session");
    } finally {
      setIsFinishing(false);
      setShowCloseSessionModal(false);
    }
  };

  if (isScanning) {
    if (!permission) {
      // Camera permissions are still loading
      return <View />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            We need your permission to show the camera
          </Text>
          <ModernButton onPress={requestPermission} title="Grant Permission" />
          <ModernButton
            onPress={() => setIsScanning(false)}
            title="Cancel"
            variant="outline"
            style={{ marginTop: spacing.md }}
          />
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: SCANNER_CONFIG.barcodeTypes as any,
          }}
        >
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={() => setIsScanning(false)}
                style={styles.closeCameraButton}
              >
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Scan Barcode</Text>
            </View>

            <View style={styles.scanFrameContainer}>
              {/* Animated Scan Frame with Corner Brackets */}
              <View style={styles.scanFrameWrapper}>
                {/* Corner Brackets */}
                <Animated.View
                  style={[
                    styles.cornerBracket,
                    styles.cornerTopLeft,
                    animatedCorners,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.cornerBracket,
                    styles.cornerTopRight,
                    animatedCorners,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.cornerBracket,
                    styles.cornerBottomLeft,
                    animatedCorners,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.cornerBracket,
                    styles.cornerBottomRight,
                    animatedCorners,
                  ]}
                />

                {/* Animated Scan Line */}
                <Animated.View style={[styles.scanLine, animatedScanLine]} />
              </View>
              <Text style={styles.scanInstruction}>
                Align barcode within frame
              </Text>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // Skeleton Loader Component
  const SkeletonLoader = ({ style }: { style?: any }) => (
    <View style={[styles.skeleton, style]}>
      <Animated.View
        style={styles.skeletonShimmer}
        entering={FadeInDown.duration(300)}
      />
    </View>
  );

  // Empty State Component
  const EmptyState = ({
    icon,
    title,
    subtitle,
  }: {
    icon: string;
    title: string;
    subtitle: string;
  }) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name={icon as any} size={48} color={colors.gray[300]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ModernHeader
        title="Scan Items"
        showBackButton
        onBackPress={() => router.back()}
        subtitle={`${currentFloor || ""} ${currentRack ? `• ${currentRack}` : ""}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
            colors={[colors.primary[600]]}
          />
        }
      >
        {/* Stats Card */}
        <Animated.View entering={FadeInDown.duration(200)}>
          {initialLoading ? (
            <ModernCard style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <SkeletonLoader
                    style={{ width: 48, height: 32, borderRadius: 8 }}
                  />
                  <SkeletonLoader
                    style={{
                      width: 60,
                      height: 12,
                      marginTop: 8,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <SkeletonLoader
                    style={{ width: 48, height: 32, borderRadius: 8 }}
                  />
                  <SkeletonLoader
                    style={{
                      width: 60,
                      height: 12,
                      marginTop: 8,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <SkeletonLoader
                    style={{ width: 48, height: 32, borderRadius: 8 }}
                  />
                  <SkeletonLoader
                    style={{
                      width: 60,
                      height: 12,
                      marginTop: 8,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            </ModernCard>
          ) : (
            <ModernCard
              style={styles.statsCard}
              accessibilityLabel={`Session stats: ${sessionStats.scannedItems} scanned, ${sessionStats.verifiedItems} verified, ${sessionStats.pendingItems} pending`}
            >
              <View style={styles.statsRow}>
                <View
                  style={styles.statItem}
                  accessibilityLabel={`${sessionStats.scannedItems} items scanned`}
                >
                  <Text style={styles.statValue}>
                    {sessionStats.scannedItems}
                  </Text>
                  <Text style={styles.statLabel}>Scanned</Text>
                </View>
                <View style={styles.statDivider} />
                <View
                  style={styles.statItem}
                  accessibilityLabel={`${sessionStats.verifiedItems} items verified`}
                >
                  <Text
                    style={[styles.statValue, { color: colors.success[600] }]}
                  >
                    {sessionStats.verifiedItems}
                  </Text>
                  <Text style={styles.statLabel}>Verified</Text>
                </View>
                <View style={styles.statDivider} />
                <View
                  style={styles.statItem}
                  accessibilityLabel={`${sessionStats.pendingItems} items pending`}
                >
                  <Text
                    style={[styles.statValue, { color: colors.warning[600] }]}
                  >
                    {sessionStats.pendingItems}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </ModernCard>
          )}
        </Animated.View>

        {/* Search Section */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(200)}
          style={styles.searchSection}
        >
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <ModernInput
                placeholder="Enter barcode or item code..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon="search"
                rightIcon={searchQuery ? "close-circle" : undefined}
                onRightIconPress={() => setSearchQuery("")}
                onSubmitEditing={() => {
                  if (searchQuery.trim()) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleLookup(searchQuery.trim());
                  }
                }}
                returnKeyType="search"
                keyboardType="default"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.searchButton,
                loading && styles.searchButtonDisabled,
              ]}
              onPress={() => {
                if (searchQuery.trim()) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleLookup(searchQuery.trim());
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsScanning(true);
                }
              }}
              disabled={loading}
              activeOpacity={0.7}
              accessibilityLabel={
                searchQuery.trim() ? "Search for item" : "Open barcode scanner"
              }
              accessibilityHint={
                searchQuery.trim()
                  ? "Search for the entered barcode or item code"
                  : "Opens camera to scan barcode"
              }
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={searchQuery.trim() ? "arrow-forward" : "scan"}
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => handleLookup(item.barcode || item.item_code)}
                >
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={colors.primary[600]}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.item_name}</Text>
                    <Text style={styles.resultCode}>{item.item_code}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Recent Items - Only show when not searching */}
        {searchResults.length === 0 && (
          <Animated.View
            entering={FadeInDown.delay(80).duration(200)}
            style={styles.recentSection}
          >
            <Text style={styles.sectionTitle}>Recent Items</Text>

            {initialLoading ? (
              // Loading Skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <ModernCard key={i} style={styles.recentCard}>
                    <View style={styles.recentRow}>
                      <SkeletonLoader
                        style={{ width: 44, height: 44, borderRadius: 12 }}
                      />
                      <View
                        style={[styles.recentInfo, { marginLeft: spacing.md }]}
                      >
                        <SkeletonLoader
                          style={{ width: "80%", height: 16, borderRadius: 4 }}
                        />
                        <SkeletonLoader
                          style={{
                            width: "50%",
                            height: 12,
                            marginTop: 6,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  </ModernCard>
                ))}
              </>
            ) : recentItems.length === 0 ? (
              // Empty State
              <EmptyState
                icon="time-outline"
                title="No Recent Scans"
                subtitle="Items you scan will appear here for quick access"
              />
            ) : (
              // Recent Items List
              recentItems.slice(0, 5).map((item, index) => (
                <ModernCard
                  key={index}
                  style={styles.recentCard}
                  onPress={() => handleLookup(item.barcode || item.item_code)}
                >
                  <View style={styles.recentRow}>
                    <View style={styles.recentIcon}>
                      <Ionicons
                        name="cube-outline"
                        size={22}
                        color={colors.primary[600]}
                      />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {item.item_name}
                      </Text>
                      <Text style={styles.recentCode}>{item.item_code}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.gray[400]}
                    />
                  </View>
                </ModernCard>
              ))
            )}
          </Animated.View>
        )}

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <ModernButton
          title="Finish Rack"
          onPress={() => setShowCloseSessionModal(true)}
          variant="primary"
          icon="checkmark-circle"
          fullWidth
        />
      </View>

      {/* Close Session Modal - Enterprise Standard */}
      <Modal
        visible={showCloseSessionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCloseSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.modalContent}
          >
            {/* Modal Icon */}
            <View style={styles.modalIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={colors.success[500]}
              />
            </View>

            <Text style={styles.modalTitle}>Complete Rack Scan?</Text>
            <Text style={styles.modalText}>
              This will finalize the scan for {currentFloor || "this location"}{" "}
              {currentRack ? `• ${currentRack}` : ""}. You won't be able to add
              more items after confirming.
            </Text>

            {/* Session Summary */}
            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Items Scanned</Text>
                <Text style={styles.modalSummaryValue}>
                  {sessionStats.scannedItems}
                </Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Verified</Text>
                <Text
                  style={[
                    styles.modalSummaryValue,
                    { color: colors.success[600] },
                  ]}
                >
                  {sessionStats.verifiedItems}
                </Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Pending Review</Text>
                <Text
                  style={[
                    styles.modalSummaryValue,
                    { color: colors.warning[600] },
                  ]}
                >
                  {sessionStats.pendingItems}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <ModernButton
                title="Keep Scanning"
                onPress={() => setShowCloseSessionModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing.md }} />
              <ModernButton
                title="Complete"
                onPress={handleFinishRack}
                loading={isFinishing}
                icon="checkmark"
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {loading && (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  statsCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  statValue: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.gray[900],
    marginBottom: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  searchSection: {
    marginBottom: spacing.xl,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  searchInputWrapper: {
    flex: 1,
    ...shadows.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  searchButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  searchButtonDisabled: {
    backgroundColor: colors.gray[300],
    shadowOpacity: 0,
  },
  searchResults: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.lg,
    zIndex: 200,
    elevation: 10,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  resultName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
  },
  resultCode: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
  fabContainer: {
    display: "none",
  },
  fabButton: {
    display: "none",
  },
  recentSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: colors.gray[500],
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  recentCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  recentCode: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  footerSpacer: {
    height: 20,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 34 : spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    ...shadows.lg,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: Platform.OS === "android" ? spacing.xl : spacing.lg,
  },
  closeCameraButton: {
    padding: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: borderRadius.full,
  },
  cameraTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.md,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 0,
    borderRadius: borderRadius.xl,
  },
  scanInstruction: {
    color: colors.white,
    marginTop: spacing.xl,
    fontSize: typography.fontSize.base,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.gray[50],
  },
  permissionText: {
    fontSize: typography.fontSize.lg,
    textAlign: "center",
    marginBottom: spacing.xl,
    color: colors.gray[700],
    lineHeight: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius["2xl"],
    padding: spacing.xl,
    ...shadows.xl,
  },
  modalIconContainer: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: "800",
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  modalText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginBottom: spacing.xl,
    lineHeight: 24,
    textAlign: "center",
  },
  modalSummary: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  modalSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalSummaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontWeight: "500",
  },
  modalSummaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: colors.gray[900],
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[100],
    borderStyle: "dashed",
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 20,
  },
  skeleton: {
    backgroundColor: colors.gray[200],
    overflow: "hidden",
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  scanFrameWrapper: {
    width: 280,
    height: 280,
    position: "relative",
  },
  cornerBracket: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: colors.white,
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.xl,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.xl,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.xl,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.xl,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 0,
    height: 2,
    backgroundColor: colors.primary[400],
    shadowColor: colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
});
