import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuthStore } from "../../src/store/authStore";
import { createSession } from "../../src/services/api/api";
import { useSessionsQuery } from "../../src/hooks/useSessionsQuery";
import { SESSION_PAGE_SIZE } from "../../src/constants/config";
import { validateSessionName } from "../../src/utils/validation";
import EnhancedTextInput from "../../src/components/forms/EnhancedTextInput";
import EnhancedButton from "../../src/components/forms/EnhancedButton";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../src/hooks/useTheme";

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, spacing, typography, borderRadius } = useTheme();

  // State for new session
  const [floorName, setFloorName] = useState("");
  const [rackName, setRackName] = useState("");
  const [currentPage] = useState(1); // Add missing currentPage state
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
      const session = await createSession(validation.value);
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
        emptyText: {
          ...typography.body,
          color: colors.textSecondary || "#94a3b8",
          textAlign: "center",
          marginTop: spacing.xl,
        },
      }),
    [colors, spacing, typography, borderRadius],
  );

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
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

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
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
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
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.sectionTitle}>Start New Area</Text>
              <Text style={styles.sectionSubtitle}>
                Enter location details to begin scanning
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Floor No.</Text>
                  <EnhancedTextInput
                    placeholder="e.g. 1, G"
                    value={floorName}
                    onChangeText={setFloorName}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Rack No.</Text>
                  <EnhancedTextInput
                    placeholder="e.g. A1, B2"
                    value={rackName}
                    onChangeText={setRackName}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <EnhancedButton
                title="Start Scanning"
                onPress={handleStartNewArea}
                loading={isCreatingSession}
                variant="primary"
                style={styles.startButton}
                icon="scan-outline"
              />
            </BlurView>
          </View>

          {/* Resume Area Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Active Areas</Text>
            {isLoadingSessions ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
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
    </View>
  );
}
