import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../../src/store/authStore";
import { createSession } from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { validateSessionName } from "../../src/utils/validation";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

const FLOOR_OPTIONS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "Top Godown",
  "Back Godown",
  "Damage Area",
];

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // State for new session
  const [floorName, setFloorName] = useState("");
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [rackName, setRackName] = useState("");
  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sessions Query
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    refetch,
  } = useSessionsQuery({
    page: currentPage,
    pageSize: SESSION_PAGE_SIZE,
  });
  const sessions = sessionsData?.items || [];

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          await logout();
          setIsLoggingOut(false);
          router.replace("/login");
        },
      },
    ]);
  };

  const handleStartNewArea = async () => {
    const validation = validateSessionName(floorName, rackName);

    if (!validation.valid || !validation.value) {
      Alert.alert(
        "Invalid Input",
        validation.error || "Please enter valid Floor and Rack numbers",
      );
      return;
    }

    try {
      setIsCreatingSession(true);
      // Pass floor and rack separately along with the combined warehouse name
      const session = await createSession(validation.value, floorName, rackName);
      setFloorName("");
      setRackName("");
      await refetch();
      router.push(`/staff/scan?sessionId=${session.id}`);
    } catch (error) {
      console.error("Create session error:", error);
      Alert.alert("Error", "Failed to start new area");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    router.push(`/staff/scan?sessionId=${sessionId}`);
  };

  const renderSessionItem = ({ item }: { item: any }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{item.warehouse}</Text>
        <Text style={styles.sessionDate}>
          {new Date(item.created_at).toLocaleDateString()}{" "}
          {new Date(item.created_at).toLocaleTimeString()}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "active"
              ? styles.statusActive
              : styles.statusClosed,
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.resumeButton}
        onPress={() => handleResumeSession(item.session_id || item.id)}
      >
        <Text style={styles.resumeButtonText}>Resume</Text>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={modernColors.primary[500]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user?.username || "Staff"}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={modernColors.error.main} />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={24}
              color={modernColors.error.main}
            />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Start New Area Section */}
          <View style={styles.section}>
            <PremiumCard
              variant="glass"
              title="Start New Area"
              subtitle="Enter location details to begin scanning"
            >
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity onPress={() => setShowFloorPicker(true)}>
                    <View pointerEvents="none">
                      <PremiumInput
                        label="Floor No."
                        placeholder="Select Floor"
                        value={floorName}
                        editable={false}
                        rightIcon="chevron-down"
                      />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <PremiumInput
                    label="Rack No."
                    placeholder="e.g. A1, B2"
                    value={rackName}
                    onChangeText={setRackName}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <PremiumButton
                title="Start Scanning"
                onPress={handleStartNewArea}
                loading={isCreatingSession}
                variant="primary"
                style={styles.startButton}
                icon="scan-outline"
              />
            </PremiumCard>
          </View>

          {/* Resume Area Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Active Areas</Text>
            {isLoadingSessions ? (
              <ActivityIndicator
                size="large"
                color={modernColors.primary[500]}
                style={{ marginTop: 20 }}
              />
            ) : sessions.length > 0 ? (
              <FlatList
                data={sessions.filter((s: any) => s.status === "active")}
                renderItem={renderSessionItem}
                keyExtractor={(item) => item.session_id || item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <Text style={styles.emptyText}>No active areas found.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFloorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFloorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFloorPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Floor</Text>
            <View style={styles.floorGrid}>
              {FLOOR_OPTIONS.map((floor) => (
                <TouchableOpacity
                  key={floor}
                  style={[
                    styles.floorOption,
                    floorName === floor && styles.floorOptionSelected,
                  ]}
                  onPress={() => {
                    setFloorName(floor);
                    setShowFloorPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.floorOptionText,
                      floorName === floor && styles.floorOptionTextSelected,
                    ]}
                  >
                    {floor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: modernSpacing.screenPadding,
    paddingBottom: modernSpacing.md,
  },
  welcomeText: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
  },
  userName: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  logoutButton: {
    padding: modernSpacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: modernBorderRadius.full,
  },
  content: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  },
  section: {
    marginBottom: modernSpacing.xl,
  },
  inputRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  startButton: {
    marginTop: modernSpacing.sm,
  },
  sectionHeader: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
    marginLeft: modernSpacing.xs,
  },
  listContent: {
    gap: modernSpacing.md,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...modernTypography.body.medium,
    fontWeight: "600",
    color: modernColors.text.primary,
    marginBottom: 4,
  },
  sessionDate: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  statusClosed: {
    backgroundColor: "rgba(100, 116, 139, 0.1)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: modernColors.success.main,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: modernSpacing.sm,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: modernBorderRadius.md,
    gap: 4,
  },
  resumeButtonText: {
    ...modernTypography.label.medium,
    fontWeight: "600",
    color: modernColors.primary[500],
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginTop: modernSpacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.lg,
  },
  modalContent: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  modalTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.lg,
    textAlign: "center",
  },
  floorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
    justifyContent: "space-between",
  },
  floorOption: {
    width: "48%", // 2 columns with gap
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.sm,
    borderRadius: modernBorderRadius.md,
    backgroundColor: modernColors.background.default,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  floorOptionSelected: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[600],
  },
  floorOptionText: {
    ...modernTypography.body.medium,
    fontWeight: "600",
    color: modernColors.text.primary,
    textAlign: "center",
  },
  floorOptionTextSelected: {
    color: "#FFFFFF",
  },
});
