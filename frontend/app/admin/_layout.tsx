/**
 * Admin Layout - Navigation structure for admin role
 * Features:
 * - Web/Tablet: Sidebar + Stack navigation (AdminSidebar)
 * - Mobile: Stack-based navigation with Aurora design
 * - Custom header with back button and logout
 * - Role-based access protection with local assertion
 * - Persistent sidebar state
 * - Error boundary for crash recovery
 */

import React from "react";
import { Stack, Slot } from "expo-router";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { auroraTheme } from "@/theme/auroraTheme";
import { AdminSidebar } from "@/components/navigation";
import { RoleLayoutGuard } from "@/components/auth/RoleLayoutGuard";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { AdminCrashScreen } from "@/components/feedback/AdminCrashScreen";
import { usePersistentState } from "@/hooks/usePersistentState";
import { breakpoints } from "@/styles/globalStyles";

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= breakpoints.desktop && Platform.OS === "web";
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState(
    "admin_sidebar_collapsed",
    false,
  );

  return (
    <RoleLayoutGuard allowedRoles={["admin"]} layoutName="AdminLayout">
      {isLargeScreen ? (
        <View style={styles.webContainer}>
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <View style={styles.mainContent}>
            <ErrorBoundary
              fallback={(error, resetError) => (
                <AdminCrashScreen error={error} resetError={resetError} />
              )}
            >
              <Slot />
            </ErrorBoundary>
          </View>
        </View>
      ) : (
        <ErrorBoundary
          fallback={(error, resetError) => (
            <AdminCrashScreen error={error} resetError={resetError} />
          )}
        >
          <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
      )}
    </RoleLayoutGuard>
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
});
