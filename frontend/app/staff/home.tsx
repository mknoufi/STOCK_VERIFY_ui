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
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { createSession } from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { validateSessionName } from "../../src/utils/validation";
import EnhancedTextInput from "../../src/components/forms/EnhancedTextInput";
import EnhancedButton from "../../src/components/forms/EnhancedButton";
import { SessionType } from "../../src/types";

import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../src/hooks/useTheme";
import {
  PremiumHeader,
  SessionCard,
  QuickStatCard,
  FloatingActionButton,
  OnlineStatus,
} from "../../src/components/ui";

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, spacing, typography, borderRadius } = useTheme();

  // State for new session
  const [floorName, setFloorName] = useState("");
  const [rackName, setRackName] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("STANDARD");

  const [currentPage] = useState(1);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Format last sync time
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

  // Update sync time on data load
  useEffect(() => {
    if (sessionsData && !isLoadingSessions) {
      setLastSyncTime(new Date());
    }
  }, [sessionsData, isLoadingSessions]);

  // Pull to refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setLastSyncTime(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

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
      const session = await createSession({
        warehouse: validation.value,
        type: sessionType,
      });
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: "#0F172A", // Hardcoded since it's a gradient background
        },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        },
        welcomeText: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight as any,
          lineHeight: typography.caption.lineHeight,
          color: colors.textSecondary,
        },
        userName: {
          fontSize: typography.h3.fontSize,
          fontWeight: typography.h3.fontWeight as any,
          lineHeight: typography.h3.lineHeight,
          color: colors.textPrimary,
        },
        logoutButton: {
          padding: spacing.sm,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderRadius: borderRadius.round,
        },
        content: {
          padding: spacing.lg,
          paddingBottom: 100,
        },
        section: {
          marginBottom: spacing.xl,
        },
        card: {
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          overflow: "hidden",
          backgroundColor: "rgba(30, 41, 59, 0.5)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
        sectionTitle: {
          ...typography.h4,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        sectionSubtitle: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginBottom: spacing.lg,
        },
        inputRow: {
          flexDirection: "row",
          gap: spacing.md,
          marginBottom: spacing.lg,
        },
        inputWrapper: {
          flex: 1,
        },
        label: {
          ...typography.caption,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
          marginLeft: spacing.xs,
        },
        startButton: {
          marginTop: spacing.sm,
        },
        sectionHeader: {
          ...typography.h5,
          color: colors.textPrimary,
          marginBottom: spacing.md,
          marginLeft: spacing.xs,
        },
        listContent: {
          gap: spacing.md,
        },
        sessionCard: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: spacing.md,
          backgroundColor: colors.surface || "#1e293b",
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border || "#334155",
        },
        sessionInfo: {
          flex: 1,
        },
        sessionTitle: {
          ...typography.body,
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: 4,
        },
        sessionDate: {
          ...typography.caption,
          color: colors.textSecondary || "#94a3b8",
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
          color: colors.success || "#10b981",
        },
        resumeButton: {
          flexDirection: "row",
          alignItems: "center",
          padding: spacing.sm,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderRadius: borderRadius.md,
          gap: 4,
        },
        resumeButtonText: {
          ...typography.caption,
          fontWeight: "600",
          color: colors.primary,
        },
        modeSelector: {
          flexDirection: "row",
          marginBottom: spacing.lg,
          backgroundColor: "rgba(30, 41, 59, 0.5)",
          borderRadius: borderRadius.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
        modeButton: {
          flex: 1,
          paddingVertical: spacing.sm,
          alignItems: "center",
          borderRadius: borderRadius.md,
        },
        modeButtonActive: {
          backgroundColor: colors.primary,
        },
        modeButtonText: {
          ...typography.caption,
          fontWeight: "600",
          color: colors.textSecondary,
        },
        modeButtonTextActive: {
          color: "#FFFFFF",
        },
        emptyState: {
          alignItems: "center",
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
        },
        emptyIcon: {
          fontSize: 48,
          marginBottom: spacing.md,
        },
        emptyTitle: {
          ...typography.h4,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        emptyText: {
          ...typography.body,
          color: colors.textSecondary || "#94a3b8",
          textAlign: "center",
        },
        statsRow: {
          flexDirection: "row",
          gap: spacing.md,
          marginBottom: spacing.xl,
        },
        statCard: {
          flex: 1,
        },
        fabContainer: {
          position: "absolute",
          bottom: spacing.xl,
          right: spacing.lg,
        },
        modeSelectorLabel: {
          ...typography.caption,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: spacing.xs,
          marginLeft: spacing.xs,
        },
        inputSectionLabel: {
          ...typography.caption,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: spacing.sm,
          marginLeft: spacing.xs,
        },
        syncStatusBar: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
          backgroundColor: "rgba(30, 41, 59, 0.3)",
          borderRadius: borderRadius.md,
        },
        syncInfo: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        syncText: {
          ...typography.caption,
          color: "#64748B",
          fontWeight: "500",
        },
      }),

    [colors, spacing, typography, borderRadius],
  );

  // Calculate stats for dashboard
  const activeSessions = sessions.filter((s: any) => s.status === "active");
  const totalItemsScanned = sessions.reduce(
    (acc: number, s: any) => acc + (s.item_count || 0),
    0,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderSessionItem = ({ item, index }: { item: any; index: number }) => (
    <SessionCard
      id={item.session_id || item.id}
      name={item.warehouse}
      status={item.status === "active" ? "active" : "completed"}
      lastUpdated={new Date(item.created_at).toLocaleDateString()}
      createdBy={item.created_by || user?.username}
      itemCount={item.item_count || 0}
      onPress={() => handleResumeSession(item.session_id || item.id)}
      onResume={() => handleResumeSession(item.session_id || item.id)}
      index={index}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Premium App Header */}
      <PremiumHeader
        title="Stock Verify"
        subtitle="Staff Dashboard"
        userName={user?.username}
        userRole={user?.role || "staff"}
        showLogo={true}
        showUserInfo={true}
        onLogout={handleLogout}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#60A5FA"
              colors={["#3B82F6", "#60A5FA"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Sync Status Bar */}
          <View style={styles.syncStatusBar}>
            <OnlineStatus />
            <View style={styles.syncInfo}>
              <Ionicons name="sync-outline" size={14} color="#64748B" />
              <Text style={styles.syncText}>
                Last sync: {formatSyncTime(lastSyncTime)}
              </Text>
            </View>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <QuickStatCard
              title="Active Areas"
              value={activeSessions.length}
              icon="folder-open"
              iconColor="#10B981"
              subtitle={
                activeSessions.length === 1 ? "In progress" : "In progress"
              }
              index={0}
              style={styles.statCard}
            />
            <QuickStatCard
              title="Total Items"
              value={totalItemsScanned}
              icon="barcode"
              iconColor="#3B82F6"
              subtitle="Scanned today"
              index={1}
              style={styles.statCard}
            />
          </View>

          {/* Start New Area Section */}
          <View style={styles.section}>
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.sectionTitle}>📍 New Count Area</Text>
              <Text style={styles.sectionSubtitle}>
                Enter floor and rack location to start stock counting
              </Text>

              {/* Count Mode Selector */}
              <Text style={styles.modeSelectorLabel}>Count Mode</Text>
              <View style={styles.modeSelector}>
                {(["STANDARD", "BLIND", "STRICT"] as SessionType[]).map(
                  (type) => {
                    const modeLabels = {
                      STANDARD: "📊 Standard",
                      BLIND: "🔒 Blind",
                      STRICT: "✅ Strict",
                    };
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.modeButton,
                          sessionType === type && styles.modeButtonActive,
                        ]}
                        onPress={() => setSessionType(type)}
                      >
                        <Text
                          style={[
                            styles.modeButtonText,
                            sessionType === type && styles.modeButtonTextActive,
                          ]}
                        >
                          {modeLabels[type]}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>

              <Text style={styles.inputSectionLabel}>📌 Location Details</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Floor / Level</Text>
                  <EnhancedTextInput
                    placeholder="e.g. 1, 2, G, B1"
                    value={floorName}
                    onChangeText={setFloorName}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Rack / Shelf</Text>
                  <EnhancedTextInput
                    placeholder="e.g. A1, B2, C3"
                    value={rackName}
                    onChangeText={setRackName}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <EnhancedButton
                title="🚀 Start Counting"
                onPress={handleStartNewArea}
                loading={isCreatingSession}
                variant="primary"
                style={styles.startButton}
                icon="scan-outline"
              />
            </BlurView>
          </View>

          {/* Active Sessions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>📂 Your Active Areas</Text>
            <Text style={styles.sectionSubtitle}>
              Continue counting where you left off
            </Text>
            {isLoadingSessions ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginTop: 20 }}
              />
            ) : activeSessions.length > 0 ? (
              <View style={styles.listContent}>
                {activeSessions.map((item: any, index: number) => (
                  <SessionCard
                    key={item.session_id || item.id}
                    id={item.session_id || item.id}
                    name={item.warehouse}
                    status="active"
                    lastUpdated={new Date(item.created_at).toLocaleDateString()}
                    createdBy={item.created_by || user?.username}
                    itemCount={item.item_count || 0}
                    onPress={() =>
                      handleResumeSession(item.session_id || item.id)
                    }
                    onResume={() =>
                      handleResumeSession(item.session_id || item.id)
                    }
                    index={index}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No Active Areas</Text>
                <Text style={styles.emptyText}>
                  Create a new count area above to get started!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button - Quick Scan */}
      <View style={styles.fabContainer}>
        <FloatingActionButton
          icon="scan"
          onPress={() => {
            if (activeSessions.length > 0) {
              const latestSession = activeSessions[0];
              handleResumeSession(latestSession.session_id || latestSession.id);
            } else {
              Alert.alert(
                "No Active Area",
                "Please create a new count area first by entering floor and rack details above.",
                [{ text: "Got it", style: "default" }],
              );
            }
          }}
          pulse={activeSessions.length > 0}
          badge={activeSessions.length > 0 ? activeSessions.length : undefined}
          gradientColors={["#3B82F6", "#6366F1"]}
          accessibilityLabel="Quick scan - resume latest area"
        />
      </View>
    </View>
  );
}
