/**
 * Admin Layout - Navigation structure for admin role
 * Features:
 * - Web/Tablet: Sidebar + Stack navigation (AdminSidebar)
 * - Mobile: Stack-based navigation with Aurora design
 * - Custom header with back button and logout
 * - Role-based access protection
 */

import React, { useState } from "react";
import { Stack, useRouter, Slot } from "expo-router";
import { TouchableOpacity, View, StyleSheet, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useAuthStore } from "../../src/store/authStore";
import { AdminSidebar } from "../../src/components/navigation";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024 && Platform.OS === "web";

export default function AdminLayout() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect non-admin users
  React.useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={auroraTheme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    ),
  };

  // Web/Tablet: Use sidebar layout
  if (isLargeScreen) {
    return (
      <View style={styles.webContainer}>
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <View style={styles.mainContent}>
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile: Use stack navigation
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="dashboard-web"
        options={{
          title: "Admin Dashboard",
          headerShown: Platform.OS !== "web",
        }}
      />
      <Stack.Screen
        name="control-panel"
        options={{ title: "Control Panel" }}
      />
      <Stack.Screen
        name="control-panel-v2"
        options={{ title: "Control Panel v2" }}
      />
      <Stack.Screen
        name="reports"
        options={{ title: "Reports" }}
      />
      <Stack.Screen
        name="metrics"
        options={{ title: "System Metrics" }}
      />
      <Stack.Screen
        name="logs"
        options={{ title: "System Logs" }}
      />
      <Stack.Screen
        name="permissions"
        options={{ title: "User Permissions" }}
      />
      <Stack.Screen
        name="security"
        options={{ title: "Security Settings" }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Admin Settings" }}
      />
      <Stack.Screen
        name="sql-config"
        options={{ title: "SQL Configuration" }}
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 8,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.background.tertiary,
  },
});
