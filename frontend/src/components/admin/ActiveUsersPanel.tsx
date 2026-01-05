/**
 * Active Users Panel - Enterprise Grade
 * Displays currently active users with strict status logic and performance optimizations.
 *
 * // cSpell:ignore Subviews nums
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  modernColors,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";

// --- Domain Types ---

export type UserRole = "admin" | "supervisor" | "staff";
export type UserStatus = "online" | "idle" | "offline";

interface ActiveUser {
  user_id: string;
  username: string;
  role: string; // Keeping string for API compatibility, but validating to UserRole
  last_activity: string; // ISO String
  current_session: string | null;
  // Status is derived, but we might receive a hint. We prioritize derived status.
  status?: string;
}

interface ActiveUsersPanelProps {
  users: ActiveUser[];
  loading?: boolean;
  onRefresh?: () => void;
  /** Callback when a user is selected (Drill-down) */
  onUserPress?: (user: ActiveUser) => void;
  /** Whether the list should be scrollable. Default: true */
  scrollEnabled?: boolean;
}

// --- Constants & Config ---

const STATUS_THRESHOLDS = {
  ACTIVE_MS: 2 * 60 * 1000, // 2 minutes
  IDLE_MS: 10 * 60 * 1000, // 10 minutes
};

const STATUS_CONFIG: Record<UserStatus, { color: string; label: string }> = {
  online: { color: modernColors.success.main, label: "Online" },
  idle: { color: modernColors.warning.main, label: "Idle" },
  offline: { color: modernColors.text.tertiary, label: "Offline" },
};

const ROLE_ICONS: Record<
  UserRole | "default",
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  admin: "shield-account",
  supervisor: "account-supervisor",
  staff: "account",
  default: "account",
};

// --- Utils ---

/**
 * Robustly calculates time ago using Intl.RelativeTimeFormat
 * Falls back to basic strings if Intl is not supported (unlikely in RN/Expo)
 */
function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    const diffMs = date.getTime() - now.getTime(); // Negative value
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    // Using 'en-US' strictly as per requirements (or pass locale prop if extended)
    const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

    if (Math.abs(diffSeconds) < 60) return "just now";
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
    return rtf.format(diffDays, "day");
  } catch (_e) {
    return "Invalid date";
  }
}

/**
 * Derives user status based on last activity time
 */
function deriveUserStatus(lastActivityIso: string): UserStatus {
  try {
    const lastActivity = new Date(lastActivityIso);
    if (isNaN(lastActivity.getTime())) return "offline";

    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();

    if (diff < STATUS_THRESHOLDS.ACTIVE_MS) return "online";
    if (diff < STATUS_THRESHOLDS.IDLE_MS) return "idle";
    return "offline";
  } catch (_e) {
    return "offline";
  }
}

function normalizeRole(role: string): UserRole {
  const r = role.toLowerCase();
  if (r === "admin" || r === "supervisor" || r === "staff")
    return r as UserRole;
  return "staff"; // Fallback
}

// --- Components ---

const UserRow = React.memo(
  ({
    user,
    onPress,
  }: {
    user: ActiveUser;
    onPress?: (u: ActiveUser) => void;
  }) => {
    const derivedStatus = deriveUserStatus(user.last_activity);
    const statusConfig = STATUS_CONFIG[derivedStatus];

    const normalizedRole = normalizeRole(user.role);
    const roleIcon = ROLE_ICONS[normalizedRole] || ROLE_ICONS.default;

    const handlePress = () => onPress?.(user);

    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <View
              style={[styles.avatarStats, { borderColor: statusConfig.color }]}
            >
              <MaterialCommunityIcons
                name={roleIcon}
                size={20}
                color={modernColors.primary[500]}
              />
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusConfig.color },
              ]}
            />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username} numberOfLines={1}>
              {user.username}
            </Text>
            <Text style={styles.role}>
              {normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.lastActivity}>
            {formatTimeAgo(user.last_activity)}
          </Text>
          {user.current_session && (
            <Text style={styles.sessionInfo} numberOfLines={1}>
              ID: {user.current_session.substring(0, 6)}...
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

UserRow.displayName = "UserRow";

export function ActiveUsersPanel({
  users,
  loading = false,
  onUserPress,
  scrollEnabled = true,
}: ActiveUsersPanelProps) {
  // Memoize stats to avoid recalculation on every render
  const stats = useMemo(() => {
    let online = 0;
    let idle = 0;
    users.forEach((u) => {
      const s = deriveUserStatus(u.last_activity);
      if (s === "online") online++;
      else if (s === "idle") idle++;
    });
    return { online, idle };
  }, [users]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color={modernColors.primary[500]}
          />
          <Text style={styles.title}>Active Users</Text>
        </View>
        <View style={styles.loadingContainer}>
          {/* Replace simple text with a proper loading indicator or skeleton in future */}
          <Text style={styles.loadingText}>Syncing personnel...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="account-group"
          size={20}
          color={modernColors.primary[500]}
        />
        <Text style={styles.title}>Active Users</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{users.length}</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View
            style={[styles.dot, { backgroundColor: modernColors.success.main }]}
          />
          <Text style={styles.summaryText}>{stats.online} online</Text>
        </View>
        <View style={styles.summaryItem}>
          <View
            style={[styles.dot, { backgroundColor: modernColors.warning.main }]}
          />
          <Text style={styles.summaryText}>{stats.idle} idle</Text>
        </View>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="account-off"
            size={32}
            color={modernColors.text.tertiary}
          />
          <Text style={styles.emptyText}>No active personnel</Text>
        </View>
      ) : (
        <FlashList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <UserRow user={item} onPress={onUserPress} />
          )}
          // @ts-ignore - estimatedItemSize required by FlashList
          estimatedItemSize={70}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.card,
    padding: 16,
    minHeight: 200,
    flex: 1,
    ...modernShadows.sm,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: modernColors.text.primary,
    flex: 1,
    letterSpacing: -0.3,
  } as TextStyle,
  countBadge: {
    backgroundColor: modernColors.primary[50] || "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modernColors.primary[200] || "#C7D2FE",
  } as ViewStyle,
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: modernColors.primary[700] || "#4338CA",
  } as TextStyle,
  summary: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  } as ViewStyle,
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  summaryText: {
    fontSize: 12,
    color: modernColors.text.secondary,
    fontWeight: "500",
  } as TextStyle,
  list: {
    flex: 1,
  } as ViewStyle,
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  } as ViewStyle,
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  } as ViewStyle,
  avatarContainer: {
    position: "relative",
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  avatarStats: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: modernColors.background.paper,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  } as ViewStyle,
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: modernColors.background.elevated,
  } as ViewStyle,
  userDetails: {
    flex: 1,
    justifyContent: "center",
  } as ViewStyle,
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: modernColors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  role: {
    fontSize: 11,
    color: modernColors.text.tertiary,
    fontWeight: "500",
  } as TextStyle,
  activityInfo: {
    alignItems: "flex-end",
    minWidth: 70,
  } as ViewStyle,
  lastActivity: {
    fontSize: 12,
    color: modernColors.text.secondary,
    fontWeight: "500",
  } as TextStyle,
  sessionInfo: {
    fontSize: 10,
    color: modernColors.text.tertiary,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 100,
  } as ViewStyle,
  loadingText: {
    color: modernColors.text.secondary,
    fontSize: 14,
    fontWeight: "500",
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  emptyText: {
    marginTop: 8,
    color: modernColors.text.secondary,
    fontSize: 14,
  } as TextStyle,
});

export default ActiveUsersPanel;
