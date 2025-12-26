import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../src/store/authStore";
import { useScanSessionStore } from "../../src/store/scanSessionStore";
import { createSession, getZones, getWarehouses } from "../../src/services/api/api";
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

  // Fetch Zones on mount
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await getZones();
        setZones(data);
      } catch (error) {
        console.error("Failed to fetch zones", error);
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

    // Fetch warehouses for the selected zone
    try {
      setIsLoadingLocations(true);
      const data = await getWarehouses(type);
      console.log("🔍 Warehouse Data for type", type, ":", JSON.stringify(data));
      setWarehouses(data);
    } catch (error) {
      console.error("Failed to fetch warehouses", error);
      Alert.alert("Error", "Failed to load floor data");
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleOpenFloorPicker = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
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
                handleResumeSection(latest.session_id || latest.id, latest.type);
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
                    style={[
                      styles.stepNumber,
                      { backgroundColor: "#0EA5E9" },
                    ]}
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
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
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
                    style={[
                      styles.stepNumber,
                      { backgroundColor: "#0EA5E9" },
                    ]}
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
                    style={[
                      styles.stepNumber,
                      { backgroundColor: "#0EA5E9" },
                    ]}
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
                  !locationType || !selectedFloor || !rackName.trim() || isCreatingSession
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
        </View>
      </Modal >

      {/* Floor Picker Modal */}
      < Modal
        visible={showFloorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFloorPicker(false)
        }
      >
        <View style={styles.floorPickerOverlay}>
          <TouchableOpacity
            style={styles.floorPickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowFloorPicker(false)}
          />
          <View
            style={[
              styles.modalContent,
              styles.floorPickerContent,
              { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" },
            ]}
          >
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                ]}
              >
                Select Floor
              </Text>
              <TouchableOpacity onPress={() => setShowFloorPicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#94A3B8" : "#64748B"}
                />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {isLoadingLocations ? (
                <ActivityIndicator color={isDark ? "#F8FAFC" : "#0F172A"} style={{ padding: 20 }} />
              ) : warehouses.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 16 }}>
                    No floors available
                  </Text>
                </View>
              ) : (
                warehouses.map((floor) => (
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
                          fontWeight: selectedFloor === floor.warehouse_name ? "700" : "400",
                        },
                      ]}
                    >
                      {floor.warehouse_name}
                    </Text>
                    {selectedFloor === floor.warehouse_name && (
                      <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                    )}
                  </TouchableOpacity>
                ))
              )
              }
            </ScrollView>
          </View>
        </View>
      </Modal >
    </ScreenContainer >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0EA5E920",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0EA5E940",
  },
  welcomeText: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
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
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
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
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 20,
  },
  modeSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 10,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 14,
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
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
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
    backgroundColor: "#0EA5E9",
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
  floorPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 10,
  },
  floorPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBackdrop: {
    flex: 1,
  },
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  floorPickerContent: {
    maxHeight: "65%",
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
