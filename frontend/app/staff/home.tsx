import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useAuthStore } from "../../src/store/authStore";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import { createSession } from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { validateSessionName } from "../../src/utils/validation";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { SessionType } from "../../src/types";

import { StatusBar } from "expo-status-bar";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useThemeContext } from "../../src/theme/ThemeContext";
import {
  AuroraBackground,
  ModernCard,
  FloatingScanButton,
  SessionCard,
  ScreenHeader,
  PatternBackground,
  SyncStatusPill,
  ScreenContainer,
} from "../../src/components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const { theme, pattern, isDark } = useThemeContext();

  // State
  const [locationType, setLocationType] = useState<LocationType | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [rackName, setRackName] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("STANDARD");
  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
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
  const sessions = sessionsData?.items || [];

  // Derived State
  const activeSessions = useMemo(
    () => sessions.filter((s: any) => s.status === "active"),
    [sessions],
  );

  const totalItemsScanned = useMemo(
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

  const handleLogout = async () => {
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

  // Render Helpers
  const formatSyncTime = (date: Date | null): string => {
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
      {/* SECTION 1: Select Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={22} color={theme.colors.accent} />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.text }]}
            >
              Select Section
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addButtonSmall,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={() => setShowNewSectionForm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text
          style={[
            styles.sectionSubtitle,
            { color: theme.colors.textSecondary },
          ]}
        >
          Tap a section to continue scanning
        </Text>

        {isLoadingSessions ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginTop: 20 }}
          />
        ) : activeSectionsList.length > 0 ? (
          <View style={styles.listContainer}>
            {activeSectionsList.map((session: any, index: number) => (
              <Animated.View
                key={session.id || session.session_id}
                entering={FadeInUp.delay(100 + index * 80)}
              >
                <ModernCard
                  variant="glass"
                  onPress={() =>
                    handleResumeSection(
                      session.session_id || session.id,
                      session.type,
                    )
                  }
                  style={styles.activeSessionCard}
                  contentStyle={styles.sessionCardContent}
                >
                  <View
                    style={[
                      styles.sessionIcon,
                      { backgroundColor: `${theme.colors.accent}20` },
                    ]}
                  >
                    <Ionicons
                      name="layers"
                      size={24}
                      color={theme.colors.accent}
                    />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text
                      style={[
                        styles.sessionName,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {session.warehouse}
                    </Text>
                    <Text
                      style={[
                        styles.sessionMeta,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {session.item_count || session.total_items || 0}{" "}
                      items •{" "}
                      {new Date(
                        session.created_at || session.started_at,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.resumeButton,
                      { backgroundColor: theme.colors.accent },
                    ]}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFF"
                    />
                  </View>
                </ModernCard>
              </Animated.View>
            ))}
          </View>
        ) : (
          <ModernCard
            variant="glass"
            intensity={10}
            style={styles.emptyState}
          >
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color={theme.colors.success || theme.colors.accent}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                All Caught Up!
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No active sections. Start a new one below.
              </Text>
            </View>
          </ModernCard>
        )}
      </View>

      {/* SECTION 2: Finished Sections with Search Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="checkmark-done-circle"
              size={22}
              color={theme.colors.success || "#22C55E"}
            />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.text }]}
            >
              Finished Sections
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.searchToggleButton,
              {
                backgroundColor: showFinishedSearch
                  ? theme.colors.accent
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setShowFinishedSearch(!showFinishedSearch);
              if (showFinishedSearch) setFinishedSearchQuery("");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="search"
              size={18}
              color={
                showFinishedSearch ? "#FFF" : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar - Only visible when enabled */}
        {showFinishedSearch && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search finished sections..."
              placeholderTextColor={theme.colors.textSecondary}
              value={finishedSearchQuery}
              onChangeText={setFinishedSearchQuery}
              autoFocus
            />
            {finishedSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setFinishedSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {finishedSections.length > 0 ? (
          <View style={styles.listContainer}>
            {finishedSections
              .slice(0, 3)
              .map((session: any, index: number) => (
                <Animated.View
                  key={session.id || session.session_id}
                  entering={FadeInUp.delay(200 + index * 50)}
                >
                  <View
                    style={[
                      styles.finishedSessionCard,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)",
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sessionCardContent}>
                      <View
                        style={[
                          styles.sessionIcon,
                          {
                            backgroundColor: `${theme.colors.success || "#22C55E"}15`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={theme.colors.success || "#22C55E"}
                        />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text
                          style={[
                            styles.sessionName,
                            { color: theme.colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {session.warehouse}
                        </Text>
                        <Text
                          style={[
                            styles.sessionMeta,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {session.item_count || session.total_items || 0}{" "}
                          items • Last used{" "}
                          {getRelativeTime(
                            session.closed_at ||
                            session.updated_at ||
                            session.created_at,
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
            {finishedSections.length > 3 && (
              <Text
                style={[
                  styles.moreText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                +{finishedSections.length - 3} more sections
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateSmall}>
            <Text
              style={[
                styles.emptyTextSmall,
                { color: theme.colors.textSecondary },
              ]}
            >
              {finishedSearchQuery
                ? "No matching sections found"
                : "No finished sections yet"}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />

      {/* New Section Modal */}
      <Modal
        visible={showNewSectionForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewSectionForm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewSectionForm(false)}
        >
          <View
            style={[
              styles.newSectionModalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Start a New Section
              </Text>
              <TouchableOpacity onPress={() => setShowNewSectionForm(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Select location and rack to begin stock counting
              </Text>

              {/* Location Type Selector */}
              <View style={styles.selectorSection}>
                <Text
                  style={[styles.label, { color: theme.colors.textSecondary }]}
                >
                  Location Type
                </Text>
                <View style={styles.locationTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.locationTypeButton,
                      {
                        borderColor:
                          locationType === "showroom"
                            ? theme.colors.accent
                            : theme.colors.border,
                      },
                      locationType === "showroom" && {
                        backgroundColor: `${theme.colors.accent}20`,
                      },
                    ]}
                    onPress={() => handleLocationTypeChange("showroom")}
                  >
                    <Ionicons
                      name="storefront"
                      size={20}
                      color={
                        locationType === "showroom"
                          ? theme.colors.accent
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.locationTypeText,
                        {
                          color:
                            locationType === "showroom"
                              ? theme.colors.accent
                              : theme.colors.text,
                        },
                      ]}
                    >
                      Showroom
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.locationTypeButton,
                      {
                        borderColor:
                          locationType === "godown"
                            ? theme.colors.accent
                            : theme.colors.border,
                      },
                      locationType === "godown" && {
                        backgroundColor: `${theme.colors.accent}20`,
                      },
                    ]}
                    onPress={() => handleLocationTypeChange("godown")}
                  >
                    <Ionicons
                      name="cube"
                      size={20}
                      color={
                        locationType === "godown"
                          ? theme.colors.accent
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.locationTypeText,
                        {
                          color:
                            locationType === "godown"
                              ? theme.colors.accent
                              : theme.colors.text,
                        },
                      ]}
                    >
                      Godown
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Floor Selector */}
              {locationType && (
                <View style={styles.selectorSection}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {locationType === "showroom" ? "Floor" : "Area"}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      },
                    ]}
                    onPress={() => setShowFloorPicker(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        {
                          color: selectedFloor
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {selectedFloor ||
                        `Select ${locationType === "showroom" ? "Floor" : "Area"
                        }`}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Rack Input */}
              {selectedFloor && (
                <View style={styles.selectorSection}>
                  <PremiumInput
                    label="Rack / Shelf"
                    placeholder="e.g. A1, B2, R1"
                    value={rackName}
                    onChangeText={setRackName}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              <PremiumButton
                title="Start Section"
                onPress={() => {
                  handleStartNewSection();
                  setShowNewSectionForm(false);
                }}
                loading={isCreatingSession}
                variant="primary"
                icon="play-circle-outline"
                style={styles.startButton}
                disabled={!locationType || !selectedFloor || !rackName.trim()}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floor Picker Modal */}
      <Modal
        visible={showFloorPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFloorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFloorPicker(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select {locationType === "showroom" ? "Floor" : "Area"}
              </Text>
              <TouchableOpacity onPress={() => setShowFloorPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {locationType &&
              LOCATION_OPTIONS[locationType].floors.map((floor) => (
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
          </View>
        </TouchableOpacity>
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
  section: {
    marginBottom: auroraTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
    marginBottom: auroraTheme.spacing.md,
  },
  listContainer: {
    gap: auroraTheme.spacing.md,
  },
  emptyState: {
    alignItems: "center",
    padding: auroraTheme.spacing.xl,
    gap: auroraTheme.spacing.sm,
  },
  emptyTitle: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.text.primary,
    marginTop: auroraTheme.spacing.sm,
  },
  emptyText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
    textAlign: "center",
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
    gap: auroraTheme.spacing.md,
  },
  locationTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: auroraTheme.spacing.sm,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 2,
  },
  locationTypeText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: auroraTheme.typography.fontSize.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: auroraTheme.borderRadius.xl,
    borderTopRightRadius: auroraTheme.borderRadius.xl,
    paddingBottom: 40,
  },
  newSectionModalContent: {
    borderTopLeftRadius: auroraTheme.borderRadius.xl,
    borderTopRightRadius: auroraTheme.borderRadius.xl,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalBody: {
    padding: auroraTheme.spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: auroraTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
  },
  modalOptionText: {
    fontSize: auroraTheme.typography.fontSize.md,
  },
  // New styles for reorganized UI
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: auroraTheme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  addButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  searchToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activeSessionCard: {
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 2,
    padding: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.sm,
  },
  finishedSessionCard: {
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 1,
    padding: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.sm,
  },
  sessionCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: auroraTheme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: auroraTheme.typography.fontSize.xs,
  },
  resumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: auroraTheme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: auroraTheme.typography.fontSize.md,
    paddingVertical: 4,
  },
  emptyStateSmall: {
    paddingVertical: auroraTheme.spacing.lg,
    alignItems: "center",
  },
  emptyTextSmall: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontStyle: "italic",
  },
  moreText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    textAlign: "center",
    marginTop: auroraTheme.spacing.sm,
    fontStyle: "italic",
  },
  newSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.lg,
    borderWidth: 2,
    marginBottom: auroraTheme.spacing.sm,
  },
  newSectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  newSectionHeaderText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
  },
});
