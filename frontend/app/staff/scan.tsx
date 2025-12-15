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

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useDebounce } from "use-debounce";
import { useAuthStore } from "@/store/authStore";
import { useScanSessionStore } from "@/store/scanSessionStore";
import { AuroraBackground, GlassCard, FloatingScanButton, ScanFeedback } from "@/components/ui";
import type { ScanFeedbackType } from "@/components/ui";
import { auroraTheme } from "@/theme/auroraTheme";
import { getItemByBarcode, searchItems, updateSessionStatus } from "@/services/api/api";
import { sanitizeBarcode } from "@/utils/validation";
import { scanDeduplicationService } from "@/services/scanDeduplicationService";
import { RecentItemsService } from "@/services/enhancedFeatures";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ScanScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sessionType } = useScanSessionStore();
  const [permission, requestPermission] = useCameraPermissions();

  // States
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Scan feedback state
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [scanFeedbackType, setScanFeedbackType] = useState<ScanFeedbackType>("success");
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState("");

  // Animation
  const quickActionsScale = useSharedValue(0);

  useEffect(() => {
    loadRecentItems();
  }, []);

  // Effect for live search
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if query is too short or empty
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);
      try {
        const results = await searchItems(debouncedSearchQuery);
        setSearchResults(results || []);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (showQuickActions) {
      quickActionsScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => setShowQuickActions(false), 200);
    } else {
      setShowQuickActions(true);
      quickActionsScale.value = withSpring(1);
    }
  };

  const handleScanPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    if (!permission?.granted) {
      requestPermission();
      return;
    }

    setIsScanning(true);
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Deduplication check
    const { isDuplicate } = scanDeduplicationService.checkDuplicate(data);
    if (isDuplicate) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      // Show visual feedback for duplicate
      setScanFeedbackType("duplicate");
      setScanFeedbackMessage("This item was recently scanned");
      setShowScanFeedback(true);
    }

    setIsScanning(false);
    await handleLookup(data);
  };

  const handleLookup = async (barcode: string) => {
    // Import validation helper
    const { validateBarcode } = require("../../src/utils/validation");

    // Validate barcode with detailed error message
    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      // Show user-friendly error in scan feedback
      setScanFeedbackType("error");
      setScanFeedbackMessage(validation.error || "Invalid barcode");
      setShowScanFeedback(true);
      return;
    }

    const sanitized = validation.value!;
    setLoading(true);
    setSearchQuery(""); // Clear search query on lookup
    setShowResults(false); // Hide results

    try {
      const item = await getItemByBarcode(sanitized);

      if (item) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Show success feedback
        setScanFeedbackType("success");
        setScanFeedbackMessage(`Found: ${item.item_name || item.item_code}`);
        setShowScanFeedback(true);

        // Track recent
        console.log("Adding to recent items service...");
        try {
          await RecentItemsService.addRecent(item.item_code, item);
          console.log("Added to recent items.");
        } catch (e) {
          console.error("Failed to add recent item:", e);
        }
        await loadRecentItems();


        // Navigate to detail
        console.log("Navigating to item detail with:", { barcode: item.item_code, sessionId });
        router.push({
          pathname: "/staff/item-detail",
          params: { barcode: item.item_code, sessionId: sessionId as string },
        } as any);
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        // Show error feedback
        setScanFeedbackType("error");
        setScanFeedbackMessage(`Item not found: ${barcode}`);
        setShowScanFeedback(true);
      }
    } catch (error: any) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", error.message || "Failed to lookup item");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (searchQuery.trim()) {
      handleLookup(searchQuery);
    }
  };

  const handleSearchResultPress = (item: any) => {
    setShowResults(false);
    // Prefer barcode, then item_code
    handleLookup(item.barcode || item.item_code);
  };

  const handleRecentItemPress = (item: any) => {
    const code = item.barcode || item.item_code;
    if (code) {
      handleLookup(code);
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout
      },
    ]);
  };

  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishRack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Finish Rack",
      "Are you sure you want to mark this rack as complete? You won't be able to add more items to this section.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish Rack",
          style: "default",
          onPress: async () => {
            if (!sessionId) {
              Alert.alert("Error", "No active session to close.");
              return;
            }
            setIsFinishing(true);
            try {
              await updateSessionStatus(sessionId, "closed");
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert("Success", "Rack marked as complete!", [
                {
                  text: "OK",
                  onPress: () => router.replace("/staff/home")
                }
              ]);
            } catch (error: any) {
              console.error("Failed to finish rack:", error);
              Alert.alert("Error", error.message || "Failed to close session.");
            } finally {
              setIsFinishing(false);
            }
          }
        },
      ]
    );
  };

  if (isScanning) {
    return (
      <View style={styles.cameraFullScreen}>
        <StatusBar style="light" />
        <CameraView
          style={styles.camera}
          onBarcodeScanned={handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
          }}
        >
          {/* AR-style overlay */}
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <Text style={styles.scanInstructions}>
              Position barcode within the frame
            </Text>

            {/* Cancel button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
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
    <View style={styles.container}>
      <StatusBar style="light" />

      <AuroraBackground variant="primary" intensity="low" animated={true}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={auroraTheme.colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Scan Items</Text>
              <View style={styles.headerSubtitleRow}>
                <Text style={styles.headerSubtitle}>Session: {sessionId || "None"}</Text>
                {sessionType !== "STANDARD" && (
                  <View style={[
                    styles.modeBadge,
                    sessionType === "BLIND" ? styles.modeBadgeBlind : styles.modeBadgeStrict
                  ]}>
                    <Text style={styles.modeBadgeText}>{sessionType}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={auroraTheme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard
              variant="medium"
              intensity={20}
              elevation="md"
              style={styles.searchCard}
            >
              <Text style={styles.cardTitle}>Quick Search</Text>
              <View style={styles.searchInputContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={auroraTheme.colors.text.secondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter barcode or item name..."
                  placeholderTextColor={auroraTheme.colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleManualSearch}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowResults(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={auroraTheme.colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Live Search Results */}
              {showResults && (
                <View style={styles.searchResultsContainer}>
                  {isSearching ? (
                    <ActivityIndicator size="small" color={auroraTheme.colors.accent[500]} style={{ padding: 10 }} />
                  ) : searchResults.length > 0 ? (
                    <View style={styles.resultsList}>
                      {searchResults.slice(0, 5).map((item) => (
                        <TouchableOpacity
                          key={item.id || item.item_code}
                          style={styles.resultItem}
                          onPress={() => handleSearchResultPress(item)}
                        >
                          <View style={styles.resultIcon}>
                            <Ionicons name="cube-outline" size={18} color={auroraTheme.colors.text.secondary} />
                          </View>
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName} numberOfLines={1}>{item.item_name || item.name}</Text>
                            <Text style={styles.resultCode}>{item.item_code}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={auroraTheme.colors.text.tertiary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    debouncedSearchQuery.length >= 2 && (
                      <Text style={styles.noResultsText}>No items found</Text>
                    )
                  )}
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Recent Items */}
          {recentItems.length > 0 && (
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Text style={styles.sectionTitle}>Recent Items</Text>
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
                      padding={auroraTheme.spacing.md}
                      style={styles.recentItemCard}
                    >
                      <View style={styles.recentItemIcon}>
                        <Ionicons name="cube-outline" size={24} color={auroraTheme.colors.primary[400]} />
                      </View>
                      <Text style={styles.recentItemCode} numberOfLines={1}>
                        {item.item_code}
                      </Text>
                      <Text style={styles.recentItemName} numberOfLines={2}>
                        {item.item_name || "Unknown Item"}
                      </Text>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Stats Card */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <GlassCard
              variant="medium"
              intensity={20}
              elevation="md"
              style={styles.statsCard}
            >
              <Text style={styles.cardTitle}>Today&apos;s Progress</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Scanned</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Verified</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Finish Rack Button */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <TouchableOpacity
              style={[styles.finishRackButton, isFinishing && styles.finishRackButtonDisabled]}
              onPress={handleFinishRack}
              disabled={isFinishing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
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
        </ScrollView>

        {/* Floating Scan Button */}
        <View style={styles.floatingButtonContainer}>
          <FloatingScanButton
            onPress={handleScanPress}
            disabled={loading}
          />
        </View>

        {/* Quick Actions Menu */}
        {showQuickActions && (
          <Animated.View style={[styles.quickActionsContainer, quickActionsStyle]}>
            <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
              <LinearGradient
                colors={auroraTheme.colors.aurora.secondary}
                style={styles.quickActionGradient}
              >
                <Ionicons name="list" size={24} color={auroraTheme.colors.text.primary} />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
              <LinearGradient
                colors={auroraTheme.colors.aurora.success}
                style={styles.quickActionGradient}
              >
                <Ionicons name="checkmark-done" size={24} color={auroraTheme.colors.text.primary} />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Verify</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Actions Toggle */}
        <TouchableOpacity
          style={styles.quickActionsToggle}
          onPress={toggleQuickActions}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={auroraTheme.colors.aurora.warm}
            style={styles.quickActionsToggleGradient}
          >
            <Ionicons
              name={showQuickActions ? "close" : "apps"}
              size={24}
              color={auroraTheme.colors.text.primary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </AuroraBackground>

      {/* Scan Feedback Overlay */}
      <ScanFeedback
        visible={showScanFeedback}
        type={scanFeedbackType}
        title={scanFeedbackMessage}
        onDismiss={() => setShowScanFeedback(false)}
        duration={2000}
      />
    </View>
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
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: auroraTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
    marginTop: 2,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeBlind: {
    backgroundColor: auroraTheme.colors.warning[500],
  },
  modeBadgeStrict: {
    backgroundColor: auroraTheme.colors.error[500],
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: auroraTheme.spacing.lg,
  },
  searchCard: {
    marginBottom: auroraTheme.spacing.lg,
  },
  cardTitle: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: auroraTheme.borderRadius.input,
    paddingHorizontal: auroraTheme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  searchIcon: {
    marginRight: auroraTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: auroraTheme.typography.fontSize.base,
    color: auroraTheme.colors.text.primary,
  },
  clearButton: {
    padding: auroraTheme.spacing.xs,
  },
  // Search Results Styles
  searchResultsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 5,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: auroraTheme.colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  resultCode: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 12,
  },
  noResultsText: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: 13,
    textAlign: "center",
    padding: 10,
  },
  sectionTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
  },
  recentItemsContainer: {
    paddingBottom: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.md,
  },
  recentItemCard: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  recentItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: auroraTheme.colors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.sm,
  },
  recentItemCode: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  },
  recentItemName: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    textAlign: "center",
  },
  statsCard: {
    marginTop: auroraTheme.spacing.lg,
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
    fontSize: auroraTheme.typography.fontSize["3xl"],
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.primary[400],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: auroraTheme.colors.border.light,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
  },
  quickActionsContainer: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
  },
  quickActionButton: {
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.md,
  },
  quickActionLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    fontWeight: auroraTheme.typography.fontWeight.medium,
  },
  quickActionsToggle: {
    position: "absolute",
    bottom: 32,
    right: 24,
  },
  quickActionsToggleGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.md,
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
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: auroraTheme.colors.primary[400],
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
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.primary,
    marginTop: auroraTheme.spacing.xl,
    textAlign: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
  },
  cancelButton: {
    position: "absolute",
    bottom: 60,
    borderRadius: auroraTheme.borderRadius.full,
    overflow: "hidden",
  },
  cancelButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
  },
  cancelButtonText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
  },
  // Finish Rack Button Styles
  finishRackButton: {
    marginTop: auroraTheme.spacing.md,
    marginHorizontal: auroraTheme.spacing.lg,
    borderRadius: auroraTheme.borderRadius.lg,
    overflow: "hidden",
  },
  finishRackButtonDisabled: {
    opacity: 0.7,
  },
  finishRackGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: auroraTheme.spacing.sm,
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.lg,
  },
  finishRackText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: "#FFF",
  },
});
