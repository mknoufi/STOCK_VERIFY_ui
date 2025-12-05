/**
 * AdminSidebar Component - Extended sidebar for admin role
 * Includes all supervisor sections plus admin-specific sections
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
  TextStyle,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernLayout,
  modernBorderRadius,
  breakpoints,
} from "../../styles/modernDesignSystem";

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

const ADMIN_GROUPS: SidebarGroup[] = [
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
        route: "/supervisor/session-detail",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        key: "control-panel",
        label: "Control Panel",
        icon: "settings",
        route: "/admin/control-panel",
      },
      {
        key: "permissions",
        label: "Permissions",
        icon: "shield",
        route: "/admin/permissions",
      },
      {
        key: "security",
        label: "Security",
        icon: "lock-closed",
        route: "/admin/security",
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
    title: "System",
    items: [
      {
        key: "metrics",
        label: "Metrics",
        icon: "stats-chart",
        route: "/admin/metrics",
      },
      {
        key: "sql-config",
        label: "SQL Config",
        icon: "server",
        route: "/admin/sql-config",
      },
      {
        key: "reports",
        label: "Reports",
        icon: "document-text",
        route: "/admin/reports",
      },
      {
        key: "logs",
        label: "System Logs",
        icon: "journal",
        route: "/admin/logs",
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

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  style,
  testID,
}) => {
  const router = useRouter();
  const segments = useSegments();
  const { user, logout } = useAuthStore();
  const { width } = Dimensions.get("window");
  const isMobile = width < breakpoints.md;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(ADMIN_GROUPS.map((g) => g.title)),
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
    ? modernLayout.sidebarCollapsedWidth
    : modernLayout.sidebarWidth;

  if (isMobile && !collapsed) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: sidebarWidth,
          backgroundColor: modernColors.background.paper,
          borderRightColor: modernColors.border.light,
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
              { borderBottomColor: modernColors.border.light },
            ]}
          >
            <View style={styles.profileAvatar}>
              <Ionicons
                name="person"
                size={24}
                color={modernColors.primary[500]}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text
                style={[
                  styles.profileName,
                  { color: modernColors.text.primary },
                ]}
                numberOfLines={1}
              >
                {user?.full_name || "Admin"}
              </Text>
              <Text
                style={[
                  styles.profileRole,
                  { color: modernColors.text.secondary },
                ]}
              >
                Administrator
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Groups */}
        {ADMIN_GROUPS.map((group) => {
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
                      { color: modernColors.text.tertiary },
                    ]}
                  >
                    {group.title}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={16}
                    color={modernColors.text.tertiary}
                  />
                </TouchableOpacity>
              )}

              {(!collapsed && isExpanded) || collapsed ? (
                <View style={styles.groupItems}>
                  {group.items.map((item) => {
                    const active = isActive(item.route);
                    const iconColor = active
                      ? modernColors.primary[500]
                      : modernColors.text.secondary;
                    const bgColor = active
                      ? `${modernColors.primary[500]}15`
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
                                    ? modernColors.primary[500]
                                    : modernColors.text.primary,
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.badge !== undefined && item.badge > 0 && (
                              <View
                                style={[
                                  styles.itemBadge,
                                  { backgroundColor: modernColors.error.main },
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
          style={[
            styles.logoutButton,
            { borderTopColor: modernColors.border.light },
          ]}
          onPress={logout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={modernColors.error.main}
          />
          <Text
            style={[styles.logoutLabel, { color: modernColors.error.main }]}
          >
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
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: modernSpacing.md,
    borderBottomWidth: 1,
    marginBottom: modernSpacing.sm,
  } as ViewStyle,
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: modernBorderRadius.full,
    backgroundColor: `${modernColors.primary[500]}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.sm,
  } as ViewStyle,
  profileInfo: {
    flex: 1,
  } as ViewStyle,
  profileName: {
    ...modernTypography.body.medium,
    fontWeight: "600",
  } as TextStyle,
  profileRole: {
    ...modernTypography.label.small,
    marginTop: 2,
  } as TextStyle,
  group: {
    marginBottom: modernSpacing.sm,
  } as ViewStyle,
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.xs,
  } as ViewStyle,
  groupTitle: {
    ...modernTypography.overline,
    fontSize: 11,
  } as TextStyle,
  groupItems: {
    paddingVertical: modernSpacing.xs,
  } as ViewStyle,
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: modernSpacing.sm,
    paddingHorizontal: modernSpacing.md,
    marginHorizontal: modernSpacing.xs,
    borderRadius: modernBorderRadius.sm,
    gap: modernSpacing.sm,
  } as ViewStyle,
  itemActive: {
    // Active state handled by backgroundColor
  } as ViewStyle,
  itemLabel: {
    ...modernTypography.body.small,
    flex: 1,
  } as TextStyle,
  itemBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  } as ViewStyle,
  itemBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  } as TextStyle,
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: modernSpacing.md,
    borderTopWidth: 1,
    gap: modernSpacing.sm,
  } as ViewStyle,
  logoutLabel: {
    ...modernTypography.body.small,
    fontWeight: "600",
  } as TextStyle,
});
