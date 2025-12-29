/**
 * Supervisor Layout - Navigation structure for supervisor role
 * Features:
 * - Web/Tablet: Sidebar + Slot navigation (SupervisorSidebar)
 * - Mobile: Stack-based navigation with Aurora design
 * - Custom header with session info
 * - Quick action buttons for common tasks
 */

import React, { useState } from "react";
import { Stack, Slot } from "expo-router";
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { auroraTheme } from "@/theme/auroraTheme";
import { RoleLayoutGuard } from "@/components/auth/RoleLayoutGuard";
import { SupervisorSidebar } from "@/components/navigation";

export default function SupervisorLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024 && Platform.OS === "web";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <RoleLayoutGuard
      allowedRoles={["supervisor", "admin"]}
      layoutName="SupervisorLayout"
    >
      {isLargeScreen ? (
        <View style={styles.webContainer}>
          <SupervisorSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <View style={styles.mainContent}>
            <Slot />
          </View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
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

