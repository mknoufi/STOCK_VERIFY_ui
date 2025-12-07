import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
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
  modernShadows,
} from "../../src/styles/modernDesignSystem";

const { width } = Dimensions.get("window");

// Quick action card component
interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
  delay: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, title, subtitle, onPress, color, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, scaleAnim, opacityAnim]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.quickAction}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

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

  // Animation values
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, headerSlide, contentFade]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Invalid Input",
        validation.error || "Please enter valid Floor and Rack numbers",
      );
      return;
    }

    try {
      setIsCreatingSession(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Pass floor and rack separately along with the combined warehouse name
      const session = await createSession(validation.value, floorName, rackName);
      setFloorName("");
      setRackName("");
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/staff/scan?sessionId=${session.id}`);
    } catch (error) {
      console.error("Create session error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to start new area");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/staff/scan?sessionId=${sessionId}`);
  };

  const renderSessionItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      style={{
        opacity: contentFade,
        transform: [{
          translateX: contentFade.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          }),
        }],
      }}
    >
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => handleResumeSession(item.session_id || item.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[modernColors.background.elevated, modernColors.background.paper]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sessionCardGradient}
        >
          <View style={styles.sessionInfo}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionIconContainer}>
                <Ionicons name="location" size={20} color={modernColors.primary[400]} />
              </View>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionTitle}>{item.warehouse}</Text>
                <Text style={styles.sessionDate}>
                  {new Date(item.created_at).toLocaleDateString()}{" "}
                  {new Date(item.created_at).toLocaleTimeString()}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                item.status === "active"
                  ? styles.statusActive
                  : styles.statusClosed,
              ]}
            >
              <View style={[
                styles.statusDot,
                { backgroundColor: item.status === "active" ? modernColors.success.main : modernColors.neutral[500] }
              ]} />
              <Text style={[
                styles.statusText,
                { color: item.status === "active" ? modernColors.success.main : modernColors.neutral[500] }
              ]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.resumeButton}>
            <Ionicons
              name="arrow-forward-circle"
              size={32}
              color={modernColors.primary[400]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={[modernColors.primary[600], modernColors.primary[800]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.username || "Staff"}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="log-out-outline" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sessions.filter((s: any) => s.status === "active").length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sessions.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Today</Text>
              <Text style={styles.statLabel}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

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
    overflow: "hidden",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: modernSpacing.screenPadding,
    paddingBottom: modernSpacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  },
  welcomeText: {
    ...modernTypography.label.medium,
    color: "rgba(255, 255, 255, 0.7)",
  },
  userName: {
    ...modernTypography.h2,
    color: "#FFFFFF",
  },
  logoutButton: {
    padding: modernSpacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: modernBorderRadius.full,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: modernBorderRadius.lg,
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    ...modernTypography.h4,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statLabel: {
    ...modernTypography.label.small,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  content: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  },
  section: {
    marginBottom: modernSpacing.xl,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.lg,
  },
  quickAction: {
    flex: 1,
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
    ...modernShadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: modernSpacing.sm,
  },
  quickActionTitle: {
    ...modernTypography.label.large,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  quickActionSubtitle: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    marginTop: 2,
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
    borderRadius: modernBorderRadius.lg,
    overflow: "hidden",
    marginBottom: modernSpacing.sm,
    ...modernShadows.md,
  },
  sessionCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: modernSpacing.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderRadius: modernBorderRadius.lg,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  sessionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: modernColors.primary[500] + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: modernSpacing.sm,
  },
  sessionMeta: {
    flex: 1,
  },
  sessionTitle: {
    ...modernTypography.body.medium,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  sessionDate: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: modernBorderRadius.full,
    gap: 6,
  },
  statusActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusClosed: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resumeButton: {
    padding: modernSpacing.xs,
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginTop: modernSpacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.lg,
  },
  modalContent: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.xl,
    padding: modernSpacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    ...modernShadows.xl,
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
    width: "48%",
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.sm,
    borderRadius: modernBorderRadius.lg,
    backgroundColor: modernColors.background.elevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  floorOptionSelected: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[400],
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
