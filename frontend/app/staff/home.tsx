import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import Modal from "react-native-modal";
import { useQueryClient } from "@tanstack/react-query";
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
import type { AppTheme } from "../../src/theme/themes";
import { useThemeContext } from "@/context/ThemeContext";
import { FloatingScanButton } from "../../src/components/ui/FloatingScanButton";
import { SyncStatusPill } from "../../src/components/ui/SyncStatusPill";
import { ScreenContainer } from "../../src/components/ui/ScreenContainer";
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
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { theme, isDark } = useThemeContext();

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // State
  const [locationType, setLocationType] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [rackName, setRackName] = useState("");
  const [sessionType] = useState<SessionType>("STANDARD");
  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFloorPicker, setShowFloorPicker] = useState(false);

  // Dynamic Location State
  const [zones, setZones] = useState<Zone[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [_isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  // Consolidated fallback warehouses helper
  const getFallbackWarehouses = (type: string): Warehouse[] => {
    if (type === "Showroom") {
      return [
        { id: "ground", warehouse_name: "Ground Floor" },
        { id: "first", warehouse_name: "First Floor" },
        { id: "second", warehouse_name: "Second Floor" },
      ];
    }
    return [
      { id: "main", warehouse_name: "Main Godown" },
      { id: "overflow", warehouse_name: "Overflow Storage" },
    ];
  };

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
    () => (Array.isArray(sessionsData?.items) ? sessionsData.items : []),
    [sessionsData?.items],
  );

  // Compute display floors for the floor picker modal
  // This ensures fallback data is always available based on locationType
  // Deduplicate and compute display floors
  const displayFloors = useMemo(() => {
    let list: Warehouse[] = [];

    if (warehouses.length > 0) {
      list = warehouses;
    } else if (locationType) {
      // Fallback floors based on location type
      if (locationType.toLowerCase().includes("showroom")) {
        list = [
          { warehouse_name: "Ground Floor", id: "fl_ground" },
          { warehouse_name: "First Floor", id: "fl_first" },
          { warehouse_name: "Second Floor", id: "fl_second" },
        ];
      } else {
        list = [
          { warehouse_name: "Main Godown", id: "wh_main" },
          { warehouse_name: "Top Godown", id: "wh_top" },
          { warehouse_name: "Damage Area", id: "wh_damage" },
        ];
      }
    }

    // Deduplicate by ID or Name
    const uniqueMap = new Map();
    list.forEach(item => {
      const key = item.id || item.warehouse_name;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const uniqueList = Array.from(uniqueMap.values());
    return uniqueList;
  }, [warehouses, locationType]);






  // Handlers
  const handleRefresh = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const { setActiveSession, setFloor, setRack } = useScanSessionStore();

  const stats = useMemo(() => {
    const activeCount = sessions.filter((s: any) => {
      const status = String(s.status || "OPEN").trim().toUpperCase();
      return status === "OPEN" || status === "ACTIVE";
    }).length;
    const totalItems = sessions.reduce((acc: number, s: any) => acc + (s.item_count || 0), 0);

    return { active: activeCount, totalItems };
  }, [sessions]);

  // State for search
  const [finishedSearchQuery, setFinishedSearchQuery] = useState("");
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showFinishedSearch, setShowFinishedSearch] = useState(false);

  // Separate active (unfinished) and closed (finished) sections
  const activeSectionsList = useMemo(() => {
    const filtered = sessions
      .filter((s: any) => {
        const status = String(s.status || "OPEN").trim().toUpperCase();
        return status === "OPEN" || status === "ACTIVE";
      })
      .map((s: any) => ({
        ...s,
        _id: s.id || s.session_id || s._id, // Normalize ID field
      }))
      .sort((a: any, b: any) => {
        // Sort by updated_at/created_at/started_at descending (most recent first)
        const aDate = new Date(
          a.updated_at || a.created_at || a.started_at || 0,
        ).getTime();
        const bDate = new Date(
          b.updated_at || b.created_at || b.started_at || 0,
        ).getTime();
        return bDate - aDate;
      });
    return filtered;
  }, [sessions]);

  const finishedSections = useMemo(() => {
    const filtered = sessions.filter((s: any) => {
      const status = String(s.status || "").trim().toUpperCase();
      return (
        status === "CLOSED" ||
        status === "COMPLETED" ||
        status === "RECONCILE"
      );
    });
    // Apply search filter
    if (finishedSearchQuery.trim()) {
      return filtered.filter((s: any) =>
        s.warehouse?.toLowerCase().includes(finishedSearchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [sessions, finishedSearchQuery]);

  const handleStartNewSection = async () => {
    // Prevent double-submit
    if (isCreatingSession) {
      return;
    }

    // Validate inputs
    if (!locationType) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toastService.show("Please select Showroom or Godown", {
        type: "warning",
      });
      return;
    }

    if (!selectedFloor || !selectedFloorId) {
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

      const sessionId = session?.id || session?.session_id || session?._id;
      queryClient.setQueryData(
        ["sessions", currentPage, SESSION_PAGE_SIZE],
        (oldData: any) => {
          const existingItems = Array.isArray(oldData?.items) ? oldData.items : [];
          if (
            sessionId &&
            existingItems.some(
              (item: any) =>
                (item?.id || item?.session_id || item?._id) === sessionId,
            )
          ) {
            return oldData;
          }
          return {
            ...(oldData || {}),
            items: [session, ...existingItems],
          };
        },
      );

      // Reset form
      setLocationType(null);
      setSelectedFloor(null);
      setSelectedFloorId(null);
      setRackName("");
      setShowNewSectionForm(false);

      // Sync with store
      setFloor(`${locationType} - ${selectedFloor}`);
      setRack(trimmedRack.toUpperCase());
      setActiveSession(session.id, sessionType);

      await refetch();
      router.push({
        pathname: "/staff/scan",
        params: { sessionId: session.id },
      } as any);
    } catch (error) {
      if (__DEV__) console.error("Create section error:", error);
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

    // Find session to get warehouse details
    const session = sessions.find(
      (s: any) =>
        (s.id || s.session_id || s._id) === sessionId,
    );

    if (session?.warehouse) {
      // Parse warehouse string: "Location - Floor - Rack"
      // We assume the last part is the rack, and the rest is the floor/location
      const parts = session.warehouse.split(" - ");
      if (parts.length >= 2) {
        const rack = parts.pop();
        const floor = parts.join(" - ");
        setFloor(floor);
        setRack(rack || "");
      } else {
        setFloor(session.warehouse);
        setRack("");
      }
    }

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

      try {
        setIsLoadingZones(true);
        const data = await getZones();
        if (Array.isArray(data) && data.length > 0) {
          setZones(data);
        }
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          if (__DEV__) console.error("Failed to fetch zones (using fallback)", error);
        }
        // Fallback already set above
      } finally {
        setIsLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  const handleLocationTypeChange = async (type: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocationType(type);
    setSelectedFloor(null); // Reset floor when location type changes
    setSelectedFloorId(null); // Reset floor ID too

    // Immediately set fallback data so UI is responsive
    const fallback = getFallbackWarehouses(type);
    setWarehouses(fallback);

    // Try to fetch from API (will update if successful)
    try {
      setIsLoadingWarehouses(true);
      const data = await getWarehouses(type);
      const warehouseList = Array.isArray(data) ? data : [];

      // Only update if API returned data
      if (warehouseList.length > 0) {
        setWarehouses(warehouseList);
      }
    } catch (error: any) {
      if (__DEV__) console.error("Failed to fetch warehouses (using fallback)", error);
      // Fallback already set above
    } finally {
      // Ensure specific timeout or cleanup if needed
      if (Platform.OS !== 'web') {
        // Small delay to ensure UI updates aren't batched aggressively
        setTimeout(() => setIsLoadingWarehouses(false), 100);
      }
    }

    // Auto-select "Ground Floor" if available in fallback or fetched data
    // We check fallback first as it's immediate
    const groundFloor = fallback.find(
      (f) =>
        f.warehouse_name.toLowerCase().includes("ground") ||
        f.id.toLowerCase().includes("ground"),
    );

    if (groundFloor) {
      setSelectedFloor(groundFloor.warehouse_name);
      setSelectedFloorId(groundFloor.id);
    }
  };

  const handleOpenFloorPicker = () => {
    if (!locationType) {
      toastService.show("Please select a zone first.", "error");
      return;
    }

    if (Platform.OS !== "web") Haptics.selectionAsync();

    // Ensure we have floors to show if warehouses is empty
    if (warehouses.length === 0) {
      const fallback = getFallbackWarehouses(locationType);
      setWarehouses(fallback);
    }

    setShowFloorPicker(true);
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
      scrollable
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      overlay={
        <View style={styles.fabContainer}>
          <FloatingScanButton
            onPress={() => {
              if (activeSectionsList.length > 0) {
                // Resume latest session (list is sorted by updated_at desc)
                const latest = activeSectionsList[0];
                handleResumeSection(latest._id, latest.type);
              } else {
                setShowNewSectionForm(true);
              }
            }}
          // FAB always enabled - allows creating new session when none exist
          />
        </View>
      }
    >
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)" },
            ]}
          >
            <Ionicons name="bar-chart" size={20} color={theme.colors.primary[500]} />
          </View>
          <View>
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)" },
            ]}
          >
            <Ionicons name="layers" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active Sections</Text>
          </View>
        </View>
      </View>
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
              backgroundColor: isDark ? theme.colors.text.primary : "#FFFFFF",
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
                <Ionicons name="add-circle" size={24} color={theme.colors.primary[500]} />
              </View>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: isDark ? theme.colors.background.default : theme.colors.text.primary },
                  ]}
                >
                  New Section
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Set up your counting area
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? theme.colors.background.paper : theme.colors.background.default },
              ]}
              onPress={() => setShowNewSectionForm(false)}
            >
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.text.secondary}
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
                  style={[styles.stepNumber, { backgroundColor: theme.colors.primary[500] }]}
                >
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? theme.colors.background.default : theme.colors.text.primary },
                  ]}
                >
                  Choose Location Type
                </Text>
              </View>
              <View style={styles.locationTypeRow}>
                {isLoadingZones && zones.length === 0 ? (
                  <ActivityIndicator color={isDark ? theme.colors.background.default : theme.colors.text.primary} />
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
                                ? theme.colors.background.paper
                                : theme.colors.background.default,
                          borderColor:
                            locationType === zone.zone_name
                              ? theme.colors.primary[500]
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
                                  : theme.colors.background.default,
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
                              ? theme.colors.primary[500]
                              : isDark
                                ? theme.colors.text.secondary
                                : theme.colors.text.secondary
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.locationTypeText,
                          {
                            color:
                              locationType === zone.zone_name
                                ? theme.colors.primary[500]
                                : isDark
                                  ? theme.colors.background.default
                                  : theme.colors.text.primary,
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
                  style={[styles.stepNumber, { backgroundColor: theme.colors.primary[500] }]}
                >
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? theme.colors.background.default : theme.colors.text.primary },
                  ]}
                >
                  Select Floor / Area
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: isDark ? theme.colors.background.paper : theme.colors.background.default,
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
                onPress={handleOpenFloorPicker}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownContent} pointerEvents="none">
                  <Ionicons
                    name="business"
                    size={20}
                    color={locationType ? theme.colors.primary[500] : theme.colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.dropdownText,
                      {
                        color: selectedFloor
                          ? isDark
                            ? theme.colors.background.default
                            : theme.colors.text.primary
                          : theme.colors.text.secondary,
                      },
                    ]}
                  >
                    {selectedFloor || "Choose a floor..."}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dropdownChevron,
                    { backgroundColor: isDark ? "#334155" : theme.colors.background.default },
                  ]}
                  pointerEvents="none"
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Step 3: Rack Name */}
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View
                  style={[styles.stepNumber, { backgroundColor: theme.colors.primary[500] }]}
                >
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isDark ? theme.colors.background.default : theme.colors.text.primary },
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
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="done"
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
                      ? theme.colors.primary[500]
                      : isDark
                        ? theme.colors.background.paper
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

          {/* Floor Picker Overlay */}
          {showFloorPicker && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark ? theme.colors.text.primary : "#FFFFFF",
                  zIndex: 20,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: isDark ? theme.colors.background.default : theme.colors.text.primary },
                    ]}
                  >
                    Select Floor
                  </Text>
                  {locationType && (
                    <Text
                      style={{
                        color: theme.colors.text.secondary,
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
                    color={theme.colors.text.secondary}
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
                        color: theme.colors.text.secondary,
                        fontSize: 16,
                        marginBottom: 8,
                      }}
                    >
                      Select a zone first
                    </Text>
                  </View>
                ) : (
                  <>
                    {displayFloors.map((floor, index) => (
                      <TouchableOpacity
                        key={index}
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
                          if (floor.warehouse_name) {
                            setSelectedFloor(floor.warehouse_name);
                            setSelectedFloorId(floor.id);
                            setShowFloorPicker(false);
                            if (Platform.OS !== "web") Haptics.selectionAsync();
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            {
                              color:
                                selectedFloor === floor.warehouse_name
                                  ? theme.colors.primary[500]
                                  : isDark
                                    ? theme.colors.background.default
                                    : theme.colors.text.primary,
                              fontWeight:
                                selectedFloor === floor.warehouse_name
                                  ? "700"
                                  : "400",
                            },
                          ]}
                        >
                          {floor.warehouse_name || "Unknown Floor"}
                        </Text>
                        {selectedFloor === floor.warehouse_name && (
                          <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
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
                          opacity: 0.5
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.colors.text.secondary,
                            fontFamily:
                              Platform.OS === "ios" ? "Menlo" : "monospace",
                          }}
                        >
                          {displayFloors.length} floors available
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme, isDark: boolean) =>
  StyleSheet.create({
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
      backgroundColor: isDark ? "rgba(14, 165, 233, 0.12)" : "rgba(14, 165, 233, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(14, 165, 233, 0.25)",
    },
    welcomeText: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginBottom: 2,
      fontWeight: "500",
    },
    userName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text.primary,
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
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    statsGrid: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 80,
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
      color: theme.colors.text.primary,
      letterSpacing: -0.3,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.text.secondary,
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
      color: theme.colors.text.primary,
      letterSpacing: -0.2,
    },
    newSectionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.accent,
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
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
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
      color: theme.colors.text.primary,
      letterSpacing: -0.2,
    },
    cardSubtitle: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginBottom: 18,
    },
    modeSection: {
      marginBottom: 18,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text.secondary,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    modeSelector: {
      flexDirection: "row",
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.05)",
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
      backgroundColor: theme.colors.accent,
    },
    modeText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text.secondary,
    },
    modeTextActive: {
      color: "#FFF",
      fontWeight: "700",
    },
    modeDescription: {
      fontSize: 11,
      color: theme.colors.text.tertiary,
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
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0,0,0,0.1)",
    },
    locationIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    },
    locationTypeText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text.primary,
    },
    checkBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
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
      borderColor: theme.colors.border.medium,
      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
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
      color: theme.colors.text.primary,
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
      backgroundColor: isDark ? "rgba(148, 163, 184, 0.3)" : "rgba(148, 163, 184, 0.5)",
      alignSelf: "center",
      marginTop: 8,
      marginBottom: 8,
    },
    modalContent: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingBottom: 40,
      backgroundColor: theme.colors.background.paper,
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
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
      color: theme.colors.text.primary,
    },
    modalSubtitle: {
      fontSize: 12,
      marginTop: 2,
      fontWeight: "500",
      color: theme.colors.text.secondary,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
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
      backgroundColor: theme.colors.accent,
    },
    stepNumberText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    stepLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text.primary,
    },
    startSectionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
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
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.medium,
    },
    modalOptionText: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.text.primary,
    },
  });
