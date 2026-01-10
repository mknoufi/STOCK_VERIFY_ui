/**
 * Staff Layout - Navigation structure for staff role
 * Features:
 * - Bottom Tab navigation for main workflow (Home, Inventory, Review, Finish)
 * - Lavanya Mart Branding integration
 */

import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleLayoutGuard } from "@/components/auth/RoleLayoutGuard";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { StaffCrashScreen } from "@/components/feedback/StaffCrashScreen";
import { useThemeContext } from "@/theme/ThemeContext";

export default function StaffLayout() {
  const { theme } = useThemeContext();

  return (
    <RoleLayoutGuard allowedRoles={["staff"]} layoutName="StaffLayout">
      <ErrorBoundary
        fallback={(error, resetError) => (
          <StaffCrashScreen error={error} resetError={resetError} />
        )}
      >
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.borderLight,
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "600",
            },
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="scan"
            options={{
              title: "Inventory",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="scan-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: "Review",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="list-outline" size={size} color={color} />
              ),
            }}
          />
          {/* Hidden Routes */}
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="components"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="item-detail"
            options={{
              href: null,
              tabBarStyle: { display: "none" },
            }}
          />
          <Tabs.Screen
            name="appearance"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </ErrorBoundary>
    </RoleLayoutGuard>
  );
}


