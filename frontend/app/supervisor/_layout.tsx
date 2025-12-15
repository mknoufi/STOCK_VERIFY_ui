/**
 * Supervisor Layout - Navigation structure for supervisor role
 * Features:
 * - Web/Tablet: Sidebar + Slot navigation (SupervisorSidebar)
 * - Mobile: Stack-based navigation with Aurora design
 * - Custom header with session info
 * - Quick action buttons for common tasks
 */

import React, { useState } from "react";
import { Stack, useRouter, Slot } from "expo-router";
import { TouchableOpacity, View, StyleSheet, Text, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useAuthStore } from "../../src/store/authStore";
import { SupervisorSidebar } from "../../src/components/navigation";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024 && Platform.OS === "web";

export default function SupervisorLayout() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect non-supervisor users
  React.useEffect(() => {
    if (user && !["supervisor", "admin"].includes(user.role)) {
      router.replace("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const navigateToSessions = () => {
    router.push("/supervisor/sessions");
  };

  const screenOptions = {
    headerStyle: {
      backgroundColor: auroraTheme.colors.background.primary,
    },
    headerTintColor: auroraTheme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: auroraTheme.typography.fontFamily.heading,
      fontWeight: "600" as const,
    },
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: auroraTheme.colors.background.primary,
    },
    headerRight: () => (
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={navigateToSessions} style={styles.actionBtn}>
          <Ionicons name="list-outline" size={20} color={auroraTheme.colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={auroraTheme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    ),
  };

  // Web/Tablet: Use sidebar layout
  if (isLargeScreen) {
    return (
      <View style={styles.webContainer}>
        <SupervisorSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <View style={styles.mainContent}>
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile: Use stack navigation
  return (
    <Stack screenOptions={screenOptions}>
      {/* Main Dashboard */}
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Supervisor Dashboard",
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <View style={styles.roleIndicator}>
                <Ionicons name="shield-checkmark" size={16} color={auroraTheme.colors.primary[500]} />
                <Text style={styles.roleText}>Supervisor</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* Sessions Management */}
      <Stack.Screen
        name="sessions"
        options={{ title: "Count Sessions" }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{ title: "Session Details" }}
      />

      {/* Variances */}
      <Stack.Screen
        name="variances"
        options={{ title: "Variance Analysis" }}
      />
      <Stack.Screen
        name="variance-details"
        options={{ title: "Variance Details" }}
      />

      {/* Export & Reports */}
      <Stack.Screen
        name="export"
        options={{ title: "Export Data" }}
      />
      <Stack.Screen
        name="export-results"
        options={{ title: "Export Results" }}
      />
      <Stack.Screen
        name="export-schedules"
        options={{ title: "Scheduled Exports" }}
      />

      {/* Operations */}
      <Stack.Screen
        name="items"
        options={{ title: "Item Search" }}
      />
      <Stack.Screen
        name="notes"
        options={{ title: "Session Notes" }}
      />
      <Stack.Screen
        name="watchtower"
        options={{ title: "Watchtower Monitor" }}
      />

      {/* Monitoring & Logs */}
      <Stack.Screen
        name="error-logs"
        options={{ title: "Error Logs" }}
      />
      <Stack.Screen
        name="activity-logs"
        options={{ title: "Activity Logs" }}
      />
      <Stack.Screen
        name="sync-conflicts"
        options={{ title: "Sync Conflicts" }}
      />
      <Stack.Screen
        name="offline-queue"
        options={{ title: "Offline Queue" }}
      />

      {/* Configuration */}
      <Stack.Screen
        name="db-mapping"
        options={{ title: "Database Mapping" }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="appearance"
        options={{ title: "Appearance" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: auroraTheme.colors.background.primary,
  },
  mainContent: {
    flex: 1,
    backgroundColor: auroraTheme.colors.background.primary,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  roleIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: auroraTheme.colors.primary[500] + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: auroraTheme.colors.primary[500],
    fontSize: 12,
    fontWeight: "600",
    fontFamily: auroraTheme.typography.fontFamily.body,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.primary[500] + "15",
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.background.tertiary,
  },
});
