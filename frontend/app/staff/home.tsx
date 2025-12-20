import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../src/store/authStore";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import { createSession } from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { SessionType } from "../../src/types";

import { auroraTheme } from "../../src/theme/auroraTheme";
import { useThemeContext } from "../../src/theme/ThemeContext";
import {
  FloatingScanButton,
  SyncStatusPill,
  ScreenContainer,
} from "../../src/components/ui";
import { SectionLists } from "./components/SectionLists";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

// Location configuration
type LocationType = "showroom" | "godown";

const LOCATION_OPTIONS: Record<
  LocationType,
  { label: string; floors: string[] }
> = {
  showroom: {
    label: "Showroom",
    floors: ["Ground Floor", "First Floor", "Third Floor"],
  },
  godown: {
    label: "Godown",
    floors: ["Top Godown", "Back Godown", "Damage Area"],
  },
};

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, isDark } = useThemeContext();

  // State
  const [locationType, setLocationType] = useState<LocationType | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [rackName, setRackName] = useState("");
  const [sessionType] = useState<SessionType>("STANDARD");
  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showFloorPicker, setShowFloorPicker] = useState(false);

  // Queries
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    refetch,
  } = useSessionsQuery({
    page: currentPage,
    pageSize: SESSION_PAGE_SIZE,
  });

  // Memoize sessions to prevent dependency array issues
  const sessions = useMemo(() => sessionsData?.items || [], [sessionsData?.items]);

  // Derived State
  const _activeSessions = useMemo(
    () => sessions.filter((s: any) => s.status === "active"),
    [sessions],
  );

  const _totalItemsScanned = useMemo(
    () =>
      sessions.reduce((acc: number, s: any) => acc + (s.item_count || 0), 0),
    [sessions],
  );

  // Effects
  useEffect(() => {
    if (sessionsData && !isLoadingSessions) {
      setLastSyncTime(new Date());
    }
  }, [sessionsData, isLoadingSessions]);

  // Handlers
  const handleRefresh = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    try {
      await refetch();
      setLastSyncTime(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const _handleLogout = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const { setActiveSession } = useScanSessionStore();

  // State for search
  const [finishedSearchQuery, setFinishedSearchQuery] = useState("");
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showFinishedSearch, setShowFinishedSearch] = useState(false);

  // Helper function for relative time
  const getRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return then.toLocaleDateString();
  };

  // Separate active (unfinished) and closed (finished) sections
  const activeSectionsList = useMemo(() => {
    const filtered = sessions.filter(
      (s: any) => s.status === "active" || s.status === "OPEN",
    );
    console.log("📋 Sessions:", sessions.length, "Active:", filtered.length);
    return filtered;
  }, [sessions]);

  const finishedSections = useMemo(() => {
    const filtered = sessions.filter(
      (s: any) =>
        s.status === "closed" ||
        s.status === "CLOSED" ||
        s.status === "completed",
    );
    // Apply search filter
    if (finishedSearchQuery.trim()) {
      return filtered.filter((s: any) =>
        s.warehouse?.toLowerCase().includes(finishedSearchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [sessions, finishedSearchQuery]);

  const handleStartNewSection = async () => {
    // Validate inputs
    if (!locationType) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Select Location", "Please select Showroom or Godown");
      return;
    }

    if (!selectedFloor) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Select Floor", "Please select a floor/area");
      return;
    }

    if (!rackName.trim()) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Enter Rack", "Please enter the rack/shelf identifier");
      return;
    }

    // Validate rack name length and format
    const trimmedRack = rackName.trim();
    if (trimmedRack.length < 1 || trimmedRack.length > 20) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Invalid Rack Name",
        "Rack name must be between 1-20 characters",
      );
      return;
    }

    // Check for invalid characters (only allow alphanumeric, dash, underscore)
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedRack)) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Invalid Rack Name",
        "Rack name can only contain letters, numbers, dashes, and underscores",
      );
      return;
    }

    // Build warehouse name: "Showroom - Ground Floor - A1"
    const locationLabel = LOCATION_OPTIONS[locationType].label;
    const warehouseName = `${locationLabel} - ${selectedFloor} - ${trimmedRack.toUpperCase()}`;

    try {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsCreatingSession(true);
      const session = await createSession({
        warehouse: warehouseName,
        type: sessionType,
      });

      // Reset form
      setLocationType(null);
      setSelectedFloor(null);
      setRackName("");

      // Sync with store
      setActiveSession(session.id, sessionType);

      await refetch();
      router.push({
        pathname: "/staff/scan",
        params: { sessionId: session.id },
      } as any);
    } catch (error) {
      console.error("Create section error:", error);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to start new section");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleResumeSection = (
    sessionId: string,
    type: SessionType = "STANDARD",
  ) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    // Sync with store
    setActiveSession(sessionId, type);

    router.push({
      pathname: "/staff/scan",
      params: { sessionId },
    } as any);
  };

  const handleLocationTypeChange = (type: LocationType) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocationType(type);
    setSelectedFloor(null); // Reset floor when location type changes
  };

  const handleOpenFloorPicker = () => {
    console.log("handleOpenFloorPicker called");
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setShowFloorPicker(true);
  };

  useEffect(() => {
    console.log("showFloorPicker state:", showFloorPicker);
  }, [showFloorPicker]);

  // Computed booleans for location type checks (avoids JSX string comparison issues)
  const isShowroomSelected = locationType === "showroom";
  const isGodownSelected = locationType === "godown";

  // Render Helpers
  const _formatSyncTime = (date: Date | null): string => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <ScreenContainer
      header={{
        title: "Stock Verify",
        subtitle: `Welcome, ${user?.username || "Staff"}`,
        showUsername: true,
        showLogoutButton: true,
        rightAction: {
          icon: "color-palette-outline",
          onPress: () => router.push("/staff/appearance" as any),
        },
        customRightContent: <SyncStatusPill />,
      }}
      backgroundType="aurora"
      auroraVariant="primary"
      withParticles
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      loading={isLoadingSessions && sessions.length === 0}
      loadingType="skeleton"
      overlay={
        <View style={styles.fabContainer}>
          <FloatingScanButton
            onPress={() => {
              if (activeSectionsList.length > 0) {
                const latest = activeSectionsList[0];
                handleResumeSection(latest.session_id || latest.id, latest.type);
              } else {
                setShowNewSectionForm(true);
                Alert.alert(
                  "No Active Section",
                  "Create a new section to start scanning.",
                );
              }
            }}
            disabled={activeSectionsList.length === 0}
          />
        </View>
      }
    >
      <SectionLists
        theme={theme}
        isDark={isDark}
        activeSections={activeSectionsList}
        finishedSections={finishedSections}
        isLoading={isLoadingSessions}
        showFinishedSearch={showFinishedSearch}
        finishedSearchQuery={finishedSearchQuery}
        onToggleSearch={() => {
          setShowFinishedSearch(!showFinishedSearch);
          if (showFinishedSearch) setFinishedSearchQuery("");
        }}
        onSearchQueryChange={setFinishedSearchQuery}
        onStartNewSection={() => setShowNewSectionForm(true)}
        onResumeSection={(sessionId, type) => handleResumeSection(sessionId, type)}
      />

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />

      {/* New Section Modal */}
      <Modal
        visible={showNewSectionForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewSectionForm(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Tap outside to close */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowNewSectionForm(false)}
          />
          <View
            style={[
              styles.newSectionModalContent,
              {
                backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.headerIconContainer,
                    { backgroundColor: "#3B82F620" },
                  ]}
                >
                  <Ionicons name="add-circle" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: isDark ? "#FFFFFF" : "#1C1C1E" },
                    ]}
                  >
                    New Section
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: isDark ? "#8E8E93" : "#6B7280" },
                    ]}
                  >
                    Set up your counting area
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: isDark ? "#2C2C2E" : "#F3F4F6" },
                ]}
                onPress={() => setShowNewSectionForm(false)}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "#8E8E93" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Step 1: Location Type */}
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepNumber,
                      { backgroundColor: "#3B82F6" },
                    ]}
                  >
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: isDark ? "#FFFFFF" : "#1C1C1E" },
                    ]}
                  >
                    Choose Location Type
                  </Text>
                </View>
                <View style={styles.locationTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.locationTypeButton,
                      {
                        backgroundColor:
                          locationType === "showroom"
                            ? "#3B82F615"
                            : isDark
                              ? "#2C2C2E"
                              : "#F9FAFB",
                        borderColor:
                          locationType === "showroom"
                            ? "#3B82F6"
                            : isDark
                              ? "#3A3A3C"
                              : "#E5E7EB",
                      },
                    ]}
                    onPress={() => handleLocationTypeChange("showroom")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.locationIcon,
                        {
                          backgroundColor:
                            locationType === "showroom"
                              ? "#3B82F620"
                              : isDark
                                ? "#3A3A3C"
                                : "#E5E7EB",
                        },
                      ]}
                    >
                      <Ionicons
                        name="storefront"
                        size={24}
                        color={
                          locationType === "showroom"
                            ? "#3B82F6"
                            : isDark
                              ? "#8E8E93"
                              : "#6B7280"
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.locationTypeText,
                        {
                          color:
                            locationType === "showroom"
                              ? "#3B82F6"
                              : isDark
                                ? "#FFFFFF"
                                : "#1C1C1E",
                        },
                      ]}
                    >
                      Showroom
                    </Text>
                    {locationType === "showroom" ? (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.locationTypeButton,
                      {
                        backgroundColor:
                          locationType === "godown"
                            ? "#8B5CF615"
                            : isDark
                              ? "#2C2C2E"
                              : "#F9FAFB",
                        borderColor:
                          locationType === "godown"
                            ? "#8B5CF6"
                            : isDark
                              ? "#3A3A3C"
                              : "#E5E7EB",
                      },
                    ]}
                    onPress={() => handleLocationTypeChange("godown")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.locationIcon,
                        {
                          backgroundColor:
                            locationType === "godown"
                              ? "#8B5CF620"
                              : isDark
                                ? "#3A3A3C"
                                : "#E5E7EB",
                        },
                      ]}
                    >
                      <Ionicons
                        name="cube"
                        size={24}
                        color={
                          locationType === "godown"
                            ? "#8B5CF6"
                            : isDark
                              ? "#8E8E93"
                              : "#6B7280"
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.locationTypeText,
                        {
                          color:
                            locationType === "godown"
                              ? "#8B5CF6"
                              : isDark
                                ? "#FFFFFF"
                                : "#1C1C1E",
                        },
                      ]}
                    >
                      Godown
                    </Text>
                    {locationType === "godown" ? (
                      <View
                        style={[styles.checkBadge, { backgroundColor: "#8B5CF6" }]}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Step 2: Floor/Area Selector */}
              {locationType && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.stepNumber,
                        {
                          backgroundColor: selectedFloor
                            ? "#10B981"
                            : "#3B82F6",
                        },
                      ]}
                    >
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: isDark ? "#FFFFFF" : "#1C1C1E" },
                      ]}
                    >
                      Select {locationType === "showroom" ? "Floor" : "Area"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      {
                        backgroundColor: isDark ? "#2C2C2E" : "#F9FAFB",
                        borderColor: selectedFloor
                          ? "#10B981"
                          : isDark
                            ? "#3A3A3C"
                            : "#E5E7EB",
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={handleOpenFloorPicker}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <View style={styles.dropdownContent}>
                      <Ionicons
                        name={locationType === "showroom" ? "layers" : "grid"}
                        size={20}
                        color={selectedFloor ? "#10B981" : "#8E8E93"}
                      />
                      <Text
                        style={[
                          styles.dropdownText,
                          {
                            color: selectedFloor
                              ? isDark
                                ? "#FFFFFF"
                                : "#1C1C1E"
                              : "#8E8E93",
                          },
                        ]}
                      >
                        {selectedFloor ||
                          `Tap to select ${locationType === "showroom" ? "floor" : "area"}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.dropdownChevron,
                        { backgroundColor: isDark ? "#3A3A3C" : "#E5E7EB" },
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={isDark ? "#8E8E93" : "#6B7280"}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 3: Rack Input */}
              {selectedFloor && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.stepNumber,
                        {
                          backgroundColor: rackName.trim()
                            ? "#10B981"
                            : "#3B82F6",
                        },
                      ]}
                    >
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: isDark ? "#FFFFFF" : "#1C1C1E" },
                      ]}
                    >
                      Enter Rack / Shelf
                    </Text>
                  </View>
                  <PremiumInput
                    placeholder="e.g. A1, B2, R1"
                    value={rackName}
                    onChangeText={setRackName}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {/* Spacer */}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Start Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.startSectionButton,
                  {
                    backgroundColor:
                      locationType && selectedFloor && rackName.trim()
                        ? "#3B82F6"
                        : isDark
                          ? "#2C2C2E"
                          : "#E5E7EB",
                  },
                ]}
                onPress={() => {
                  handleStartNewSection();
                  setShowNewSectionForm(false);
                }}
                disabled={
                  !locationType ||
                  !selectedFloor ||
                  !rackName.trim() ||
                  isCreatingSession
                }
                activeOpacity={0.8}
              >
                {isCreatingSession ? (
                  <Text style={styles.startButtonText}>Creating...</Text>
                ) : (
                  <>
                    <Ionicons name="play-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start Section</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floor Picker Modal */}
      <Modal
        visible={showFloorPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFloorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.colors.text, flex: 1 },
                ]}
                numberOfLines={1}
              >
                Select {locationType === "showroom" ? "Floor" : "Area"}
              </Text>
              <TouchableOpacity onPress={() => setShowFloorPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {!locationType && (
              <View style={styles.modalBody}>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Select a location type above to see available options.
                </Text>
              </View>
            )}

            {locationType && (
              <>
                {LOCATION_OPTIONS[locationType].floors.length === 0 ? (
                  <View style={styles.modalBody}>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      No {locationType === "showroom" ? "floors" : "areas"} have
                      been configured yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView>
                    {LOCATION_OPTIONS[locationType].floors.map((floor) => (
                      <TouchableOpacity
                        key={floor}
                        style={[
                          styles.modalOption,
                          selectedFloor === floor && {
                            backgroundColor: `${theme.colors.accent}20`,
                          },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.selectionAsync();
                          setSelectedFloor(floor);
                          setShowFloorPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            {
                              color:
                                selectedFloor === floor
                                  ? theme.colors.accent
                                  : theme.colors.text,
                            },
                          ]}
                        >
                          {floor}
                        </Text>
                        {selectedFloor === floor && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={theme.colors.accent}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
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
  welcomeText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  userName: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.text.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: auroraTheme.spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.xl,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.text.primary,
  },
  statLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
  },
  createCard: {
    padding: auroraTheme.spacing.lg,
    marginBottom: auroraTheme.spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    marginBottom: auroraTheme.spacing.xs,
  },
  cardTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
  },
  cardSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
    marginBottom: auroraTheme.spacing.lg,
  },
  modeSection: {
    marginBottom: auroraTheme.spacing.lg,
  },
  label: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: auroraTheme.typography.fontWeight.medium,
    color: auroraTheme.colors.text.secondary,
    marginBottom: auroraTheme.spacing.sm,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: auroraTheme.borderRadius.lg,
    padding: 2,
    marginBottom: auroraTheme.spacing.xs,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: auroraTheme.borderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: auroraTheme.colors.primary[500],
  },
  modeText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: auroraTheme.typography.fontWeight.medium,
    color: auroraTheme.colors.text.secondary,
  },
  modeTextActive: {
    color: "#FFF",
    fontWeight: auroraTheme.typography.fontWeight.bold,
  },
  modeDescription: {
    fontSize: 11,
    color: auroraTheme.colors.text.tertiary,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.lg,
  },
  startButton: {
    marginTop: auroraTheme.spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    bottom: 32,
    right: 0,
    left: 0,
    alignItems: "center",
  },
  // New styles for section form
  selectorSection: {
    marginBottom: auroraTheme.spacing.md,
  },
  locationTypeRow: {
    flexDirection: "row",
    gap: 12,
  },
  locationTypeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  locationTypeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 56,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownText: {
    fontSize: 15,
    flex: 1,
  },
  dropdownChevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  newSectionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  startSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalOptionText: {
    fontSize: 16,
  },
});
