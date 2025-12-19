/**
 * SupervisorSidebar Component - Persistent sidebar for supervisor/admin
 * Collapsible on mobile (drawer), always visible on web/tablet
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ViewStyle,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useAuthStore } from "../../store/authStore";
import {
  layout,
  spacing,
  typography,
  breakpoints,
} from "../../styles/globalStyles";

interface SidebarItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const SUPERVISOR_GROUPS: SidebarGroup[] = [
  {
    title: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "grid",
        route: "/supervisor/dashboard",
      },
      {
        key: "sessions",
        label: "Sessions",
        icon: "cube",
        route: "/supervisor/sessions",
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        key: "activity-logs",
        label: "Activity Logs",
        icon: "list",
        route: "/supervisor/activity-logs",
      },
      {
        key: "error-logs",
        label: "Error Logs",
        icon: "warning",
        route: "/supervisor/error-logs",
      },
      {
        key: "sync-conflicts",
        label: "Sync Conflicts",
        icon: "sync",
        route: "/supervisor/sync-conflicts",
      },
    ],
  },
  {
    title: "Exports",
    items: [
      {
        key: "export-schedules",
        label: "Export Schedules",
        icon: "calendar",
        route: "/supervisor/export-schedules",
      },
      {
        key: "export-results",
        label: "Export Results",
        icon: "document",
        route: "/supervisor/export-results",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: "settings",
        route: "/supervisor/settings",
      },
      {
        key: "db-mapping",
        label: "DB Mapping",
        icon: "server",
        route: "/supervisor/db-mapping",
      },
    ],
  },
];

interface SupervisorSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  style,
  testID,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { user, logout } = useAuthStore();
  const { width } = Dimensions.get("window");
  const isMobile = width < breakpoints.tablet;

  // On mobile, show as drawer (controlled by parent)
  // On web/tablet, show as persistent sidebar
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(SUPERVISOR_GROUPS.map((g) => g.title)),
  );

  const currentRoute = segments.join("/");
  const isActive = (route: string) => {
    const routePath = route.replace(/^\//, "");
    return (
      currentRoute === routePath || currentRoute.startsWith(routePath + "/")
    );
  };

  const handleItemPress = (item: SidebarItem) => {
    router.push(item.route as any);
  };

  const toggleGroup = (title: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedGroups(newExpanded);
  };

  const sidebarWidth = collapsed
    ? layout.sidebarCollapsedWidth
    : layout.sidebarWidth;

  if (isMobile && !collapsed) {
    // On mobile, sidebar is handled by drawer component
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: sidebarWidth,
          backgroundColor: theme.colors.surface,
          borderRightColor: theme.colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        {!collapsed && (
          <View
            style={[
              styles.profileSection,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text
                style={[styles.profileName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {user?.full_name || "User"}
              </Text>
              <Text
                style={[
                  styles.profileRole,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {user?.role === "admin" ? "Administrator" : "Supervisor"}
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Groups */}
        {SUPERVISOR_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.title);

          return (
            <View key={group.title} style={styles.group}>
              {!collapsed && (
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleGroup(group.title)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.groupTitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {group.title}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}

              {(!collapsed && isExpanded) || collapsed ? (
                <View style={styles.groupItems}>
                  {group.items.map((item) => {
                    const active = isActive(item.route);
                    const iconColor = active
                      ? theme.colors.primary
                      : theme.colors.textSecondary;
                    const bgColor = active
                      ? theme.colors.overlayPrimary || "rgba(76, 175, 80, 0.1)"
                      : "transparent";

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.item,
                          { backgroundColor: bgColor },
                          active && styles.itemActive,
                        ]}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={item.label}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={iconColor}
                        />
                        {!collapsed && (
                          <>
                            <Text
                              style={[
                                styles.itemLabel,
                                {
                                  color: active
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.badge !== undefined && item.badge > 0 && (
                              <View
                                style={[
                                  styles.itemBadge,
                                  { backgroundColor: theme.colors.error },
                                ]}
                              >
                                <Text style={styles.itemBadgeText}>
                                  {item.badge > 99 ? "99+" : item.badge}
                                </Text>
                              </View>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Logout Button */}
      {!collapsed && (
        <TouchableOpacity
          style={[styles.logoutButton, { borderTopColor: theme.colors.border }]}
          onPress={logout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.colors.error}
          />
          <Text style={[styles.logoutLabel, { color: theme.colors.error }]}>
            Logout
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    borderRightWidth: 1,
    ...(Platform.OS === "web"
      ? {
          position: "fixed" as const,
          left: 0,
          top: 0,
          bottom: 0,
        }
      : {}),
  } as any,
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  profileRole: {
    ...typography.caption,
    marginTop: 2,
  },
  group: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  groupTitle: {
    ...typography.overline,
    fontSize: 11,
  },
  groupItems: {
    paddingVertical: spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
    gap: spacing.sm,
  },
  itemActive: {
    // Active state handled by backgroundColor
  },
  itemLabel: {
    ...typography.bodySmall,
    flex: 1,
  },
  itemBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  itemBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  logoutLabel: {
    ...typography.bodySmall,
    fontWeight: "600",
  },
});
