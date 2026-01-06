import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Modal from "react-native-modal";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../src/store/authStore";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import {
  createSession,
  getZones,
  getWarehouses,
} from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { SessionType } from "../../src/types";
import { useThemeContext } from "../../src/theme/ThemeContext";
import {
  FloatingScanButton,
  SyncStatusPill,
  ScreenContainer,
} from "../../src/components/ui";
import { SectionLists } from "./components/SectionLists";
import { toastService } from "../../src/services/utils/toastService";

interface Zone {
  id: string;
  zone_name: string;
}

interface Warehouse {
  id: string;
  warehouse_name: string;
}

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, isDark } = useThemeContext();

  // State
  const [locationType, setLocationType] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [rackName, setRackName] = useState("");
  const [sessionType] = useState<SessionType>("STANDARD");
  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Dynamic Location State
  const [zones, setZones] = useState<Zone[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

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
  const sessions = useMemo(
    () => sessionsData?.items || [],
    [sessionsData?.items],
  );

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

  // Compute display floors for the floor picker modal
  // This ensures fallback data is always available based on locationType
  const displayFloors = useMemo(() => {
    if (warehouses.length > 0) {
      return warehouses;
    }
    if (!locationType) {
      return [];
    }
    // Fallback floors based on location type
    if (locationType.toLowerCase().includes("showroom")) {
      return [
        { warehouse_name: "Ground Floor", id: "fl_ground" },
        { warehouse_name: "First Floor", id: "fl_first" },
        { warehouse_name: "Second Floor", id: "fl_second" },
      ];
    }
    return [
      { warehouse_name: "Main Godown", id: "wh_main" },
      { warehouse_name: "Top Godown", id: "wh_top" },
      { warehouse_name: "Damage Area", id: "wh_damage" },
    ];
  }, [warehouses, locationType]);

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
    setShowLogoutModal(true);
  };

  const { setActiveSession } = useScanSessionStore();

  // State for search
  const [finishedSearchQuery, setFinishedSearchQuery] = useState("");
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showFinishedSearch, setShowFinishedSearch] = useState(false);

  // Helper function for relative time
  const _getRelativeTime = (date: Date | string): string => {
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
      toastService.show("Please select Showroom or Godown", {
        type: "warning",
      });
      return;
    }

    if (!selectedFloor) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toastService.show("Please select a floor/area", { type: "warning" });
      return;
    }

    if (!rackName.trim()) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toastService.show("Please enter the rack/shelf identifier", {
        type: "warning",
      });
      return;
    }

    // Validate rack name length and format
    const trimmedRack = rackName.trim();
    if (trimmedRack.length < 1 || trimmedRack.length > 20) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toastService.show("Rack name must be between 1-20 characters", {
        type: "warning",
      });
      return;
    }

    // Check for invalid characters (only allow alphanumeric, dash, underscore)
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedRack)) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toastService.show(
        "Rack name can only contain letters, numbers, dashes, and underscores",
        { type: "warning" },
      );
      return;
    }

    // Build warehouse name: "Showroom - Ground Floor - A1"
    const warehouseName = `${locationType} - ${selectedFloor} - ${trimmedRack.toUpperCase()}`;

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
      toastService.show("Failed to start new section", { type: "error" });
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

  // Fetch Zones on mount
  useEffect(() => {
    const fetchZones = async () => {
      // Set fallback zones immediately so UI is usable
      const fallbackZones = [
        { zone_name: "Showroom", id: "zone_showroom" },
        { zone_name: "Godown", id: "zone_godown" },
      ];
      setZones(fallbackZones);
      console.log(
        "🗺️ Set fallback zones:",
        fallbackZones.map((z) => z.zone_name),
      );

      try {
        setIsLoadingLocations(true);
        const data = await getZones();
        if (Array.isArray(data) && data.length > 0) {
          setZones(data);
          console.log(
            "🗺️ Updated zones from API:",
            data.map((z: any) => z.zone_name),
          );
        }
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          console.error("Failed to fetch zones (using fallback)", error);
        }
        // Fallback already set above
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchZones();
  }, []);

  const handleLocationTypeChange = async (type: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocationType(type);
    setSelectedFloor(null); // Reset floor when location type changes

    // Immediately set fallback data so UI is responsive
    const fallback = type.toLowerCase().includes("showroom")
      ? [
          { warehouse_name: "Ground Floor", id: "fl_ground" },
          { warehouse_name: "First Floor", id: "fl_first" },
          { warehouse_name: "Second Floor", id: "fl_second" },
        ]
      : [
          { warehouse_name: "Main Godown", id: "wh_main" },
          { warehouse_name: "Top Godown", id: "wh_top" },
          { warehouse_name: "Damage Area", id: "wh_damage" },
        ];
    setWarehouses(fallback);
    console.log("🏢 Set fallback warehouses for", type, ":", fallback.length);

    // Try to fetch from API (will update if successful)
    try {
      setIsLoadingLocations(true);
      const data = await getWarehouses(type);
      console.log(
        "🔍 Warehouse Data for type",
        type,
        ":",
        JSON.stringify(data),
      );
      const warehouseList = Array.isArray(data) ? data : [];

      // Only update if API returned data
      if (warehouseList.length > 0) {
        setWarehouses(warehouseList);
      }
    } catch (error: any) {
      console.error("Failed to fetch warehouses (using fallback)", error);
      // Fallback already set above
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleOpenFloorPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    console.log(
      "🚪 handleOpenFloorPicker called. warehouses:",
      warehouses.length,
      "locationType:",
      locationType,
    );

    // Ensure we have floors to show if warehouses is empty
    if (locationType && warehouses.length === 0) {
      const fallback = locationType.toLowerCase().includes("showroom")
        ? [
            { warehouse_name: "Ground Floor", id: "fl_ground" },
            { warehouse_name: "First Floor", id: "fl_first" },
            { warehouse_name: "Second Floor", id: "fl_second" },
          ]
        : [
            { warehouse_name: "Main Godown", id: "wh_main" },
            { warehouse_name: "Top Godown", id: "wh_top" },
            { warehouse_name: "Damage Area", id: "wh_damage" },
          ];
      console.log(
        "🏢 Setting warehouses to fallback:",
        fallback.map((f) => f.warehouse_name),
      );
      setWarehouses(fallback);
    }

    setShowFloorPicker(true);
  };

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
                handleResumeSection(
                  latest.session_id || latest.id,
                  latest.type,
                );
              } else {
                setShowNewSectionForm(true);
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
        onResumeSection={(sessionId, type) =>
          handleResumeSection(sessionId, type)
        }
      />

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />

      {/* New Section Modal */}
      {/* @ts-ignore */}
      <Modal
        isVisible={showNewSectionForm}
        onBackdropPress={() => setShowNewSectionForm(false)}
        onBackButtonPress={() => setShowNewSectionForm(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        swipeDirection="down"
        onSwipeComplete={() => setShowNewSectionForm(false)}
        useNativeDriver
        hideModalContentWhileAnimating
      >
        <View
          style={[
            styles.newSectionModalContent,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
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
                  { backgroundColor: "#0EA5E920" },
                ]}
              >
                <Ionicons name="add-circle" size={24} color="#0EA5E9" />
              </View>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  New Section
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Set up your counting area
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
              ]}
              onPress={() => setShowNewSectionForm(false)}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#94A3B8" : "#64748B"}
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
                  style={[styles.stepNumber, { backgroundColor: "#0EA5E9" }]}
                >
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  Choose Location Type
                </Text>
              </View>
              <View style={styles.locationTypeRow}>
                {isLoadingLocations && zones.length === 0 ? (
                  <ActivityIndicator color={isDark ? "#F8FAFC" : "#0F172A"} />
                ) : (
                  zones.map((zone) => (
                    <TouchableOpacity
                      key={zone.id || zone.zone_name}
                      style={[
                        styles.locationTypeButton,
                        {
                          backgroundColor:
                            locationType === zone.zone_name
                              ? "#0EA5E915"
                              : isDark
                                ? "#1E293B"
                                : "#F8FAFC",
                          borderColor:
                            locationType === zone.zone_name
                              ? "#0EA5E9"
                              : isDark
                                ? "#334155"
                                : "#E2E8F0",
                        },
                      ]}
                      onPress={() => handleLocationTypeChange(zone.zone_name)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.locationIcon,
                          {
                            backgroundColor:
                              locationType === zone.zone_name
                                ? "#0EA5E920"
                                : isDark
                                  ? "#334155"
                                  : "#F1F5F9",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            zone.zone_name.toLowerCase().includes("showroom")
                              ? "storefront"
                              : "cube"
                          }
                          size={24}
                          color={
                            locationType === zone.zone_name
                              ? "#0EA5E9"
                              : isDark
                                ? "#94A3B8"
                                : "#64748B"
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.locationTypeText,
                          {
                            color:
                              locationType === zone.zone_name
                                ? "#0EA5E9"
                                : isDark
                                  ? "#F8FAFC"
                                  : "#0F172A",
                          },
                        ]}
                      >
                        {zone.zone_name}
                      </Text>
                      {locationType === zone.zone_name ? (
                        <View style={styles.checkBadge}>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#FFFFFF"
                          />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Step 2: Floor Selection */}
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View
                  style={[styles.stepNumber, { backgroundColor: "#0EA5E9" }]}
                >
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  Select Floor / Area
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
                onPress={handleOpenFloorPicker}
                disabled={!locationType}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownContent}>
                  <Ionicons
                    name="business"
                    size={20}
                    color={locationType ? "#0EA5E9" : "#94A3B8"}
                  />
                  <Text
                    style={[
                      styles.dropdownText,
                      {
                        color: selectedFloor
                          ? isDark
                            ? "#F8FAFC"
                            : "#0F172A"
                          : "#94A3B8",
                      },
                    ]}
                  >
                    {selectedFloor || "Choose a floor..."}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dropdownChevron,
                    { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Step 3: Rack Name */}
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View
                  style={[styles.stepNumber, { backgroundColor: "#0EA5E9" }]}
                >
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  Rack / Shelf Identifier
                </Text>
              </View>

              <PremiumInput
                value={rackName}
                onChangeText={setRackName}
                placeholder="e.g. RACK-A1, SHELF-02"
                leftIcon="grid-outline"
                autoCapitalize="characters"
                editable={!!selectedFloor}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.startSectionButton,
                {
                  backgroundColor:
                    locationType && selectedFloor && rackName.trim()
                      ? "#0EA5E9"
                      : isDark
                        ? "#1E293B"
                        : "#E2E8F0",
                },
              ]}
              onPress={handleStartNewSection}
              disabled={
                !locationType ||
                !selectedFloor ||
                !rackName.trim() ||
                isCreatingSession
              }
              activeOpacity={0.8}
            >
              {isCreatingSession ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.startButtonText}>Start Counting</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floor Picker Modal */}
      {/* @ts-ignore */}
      <Modal
        isVisible={showFloorPicker}
        onBackdropPress={() => setShowFloorPicker(false)}
        onBackButtonPress={() => setShowFloorPicker(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        swipeDirection="down"
        onSwipeComplete={() => setShowFloorPicker(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        statusBarTranslucent
      >
        <View
          style={[
            styles.modalContent,
            styles.floorPickerContent,
            { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" },
          ]}
        >
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                ]}
              >
                Select Floor
              </Text>
              {locationType && (
                <Text
                  style={{
                    color: isDark ? "#94A3B8" : "#64748B",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  for {locationType}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowFloorPicker(false)}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {displayFloors.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Ionicons
                  name="folder-open-outline"
                  size={48}
                  color={isDark ? "#475569" : "#CBD5E1"}
                  style={{ marginBottom: 12 }}
                />
                <Text
                  style={{
                    color: isDark ? "#94A3B8" : "#64748B",
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  Select a zone first
                </Text>
              </View>
            ) : (
              <>
                {displayFloors.map((floor) => (
                  <TouchableOpacity
                    key={floor.id || floor.warehouse_name}
                    style={[
                      styles.modalOption,
                      {
                        backgroundColor:
                          selectedFloor === floor.warehouse_name
                            ? "#0EA5E910"
                            : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setSelectedFloor(floor.warehouse_name);
                      setShowFloorPicker(false);
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        {
                          color:
                            selectedFloor === floor.warehouse_name
                              ? "#0EA5E9"
                              : isDark
                                ? "#F8FAFC"
                                : "#0F172A",
                          fontWeight:
                            selectedFloor === floor.warehouse_name
                              ? "700"
                              : "400",
                        },
                      ]}
                    >
                      {floor.warehouse_name}
                    </Text>
                    {selectedFloor === floor.warehouse_name && (
                      <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                    )}
                  </TouchableOpacity>
                ))}
                {__DEV__ && (
                  <View
                    style={{
                      padding: 10,
                      marginTop: 10,
                      borderTopWidth: 1,
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: isDark ? "#94A3B8" : "#64748B",
                        fontFamily:
                          Platform.OS === "ios" ? "Menlo" : "monospace",
                      }}
                    >
                      Debug: {displayFloors.length} floors available
                      {"\n"}Location: {locationType}
                      {"\n"}Warehouses: {warehouses.length}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

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
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderRadius: 20,
            padding: 24,
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
              borderRadius: 32,
              backgroundColor: "#EF444420",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="log-out" size={32} color="#EF4444" />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: isDark ? "#F8FAFC" : "#0F172A",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Log Out
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: isDark ? "#94A3B8" : "#64748B",
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Are you sure you want to log out?{"\n"}Any unsaved progress will be
            lost.
          </Text>

          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: isDark ? "#334155" : "#F1F5F9",
                alignItems: "center",
              }}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: "#EF4444",
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
                  color: "#FFFFFF",
                }}
              >
                Log Out
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.25)",
  },
  welcomeText: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 2,
    fontWeight: "500",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  newSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newSectionButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  createCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 18,
  },
  modeSection: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: "#0EA5E9",
  },
  modeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  modeTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  modeDescription: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  startButton: {
    marginTop: 8,
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
    marginBottom: 20,
  },
  locationTypeRow: {
    flexDirection: "row",
    gap: 12,
  },
  locationTypeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    position: "relative",
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  locationTypeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownText: {
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  dropdownChevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  // Modal styles

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 40,
  },
  floorPickerContent: {
    maxHeight: "65%",
  },
  newSectionModalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
    paddingVertical: 14,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContainer: {
    marginBottom: 18,
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
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  startSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: "500",
  },
});
