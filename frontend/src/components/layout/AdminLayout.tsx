/**
 * AdminLayout Component - Layout wrapper for admin routes
 * Includes AdminSidebar (web/tablet) or Drawer (mobile), AppHeader, and Screen
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TouchableOpacity,
} from "react-native";
import { useSegments } from "expo-router";
import { Screen } from "./Screen";
import { AppHeader } from "../navigation/AppHeader";
import { AdminSidebar } from "../navigation/AdminSidebar";
import { layout, breakpoints } from "../../styles/globalStyles";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: {
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  }[];
  style?: ViewStyle;
  testID?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  headerActions = [],
  style,
  testID,
}) => {
  const rawSegments = useSegments();
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  const { width } = Dimensions.get("window");
  const isMobile = width < breakpoints.tablet;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-detect title from route if not provided
  const screenTitle =
    title ||
    ((segments[1] as string | undefined) === "control-panel"
      ? "Control Panel"
      : (segments[1] as string | undefined) === "metrics"
        ? "Metrics"
        : (segments[1] as string | undefined) === "permissions"
          ? "Permissions"
          : (segments[1] as string | undefined) === "security"
            ? "Security"
            : "Admin");

  // On mobile, sidebar becomes a drawer
  if (isMobile) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <AppHeader
          title={screenTitle}
          showBack={false}
          actions={[
            {
              icon: "menu",
              label: "Open menu",
              onPress: () => setDrawerOpen(true),
            },
            ...headerActions,
          ]}
        />
        <Screen variant="scrollable" style={styles.screen}>
          {children}
        </Screen>
        {/* Drawer overlay */}
        {drawerOpen && (
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={() => setDrawerOpen(false)}
            />
            <View style={styles.drawer}>
              <AdminSidebar collapsed={false} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Web/Tablet: Persistent sidebar
  return (
    <View style={[styles.container, style]} testID={testID}>
      <AdminSidebar collapsed={sidebarCollapsed} />
      <View
        style={[
          styles.content,
          {
            marginLeft: sidebarCollapsed
              ? layout.sidebarCollapsedWidth
              : layout.sidebarWidth,
          },
        ]}
      >
        <AppHeader
          title={screenTitle}
          showBack={false}
          actions={[
            {
              icon: sidebarCollapsed ? "chevron-forward" : "chevron-back",
              label: sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
              onPress: () => setSidebarCollapsed(!sidebarCollapsed),
            },
            ...headerActions,
          ]}
        />
        <Screen variant="scrollable" style={styles.screen}>
          {children}
        </Screen>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: layout.sidebarWidth,
    zIndex: 1001,
  },
});
