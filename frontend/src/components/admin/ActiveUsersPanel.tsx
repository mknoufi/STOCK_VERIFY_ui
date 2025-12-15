/**
 * Active Users Panel - Displays currently active users with their status
 * Shows user role, last activity, and current session info
 */

import React from "react";
import { View, Text, StyleSheet, FlatList, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

interface ActiveUser {
  user_id: string;
  username: string;
  role: string;
  last_activity: string;
  current_session: string | null;
  status: "online" | "idle" | "offline";
}

interface ActiveUsersPanelProps {
  users: ActiveUser[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_CONFIG = {
  online: { color: auroraTheme.colors.success[500], label: "Online" },
  idle: { color: auroraTheme.colors.warning[500], label: "Idle" },
  offline: { color: auroraTheme.colors.text.secondary, label: "Offline" },
};

const ROLE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  admin: "shield-account",
  supervisor: "account-supervisor",
  staff: "account",
};

function formatLastActivity(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

function UserRow({ user }: { user: ActiveUser }) {
  const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.offline;
  const roleIcon = ROLE_ICONS[user.role] || ROLE_ICONS.staff;

  return (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons
            name={roleIcon}
            size={24}
            color={auroraTheme.colors.primary[500]}
          />
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusConfig.color }
            ]}
          />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.role}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.lastActivity}>
          {formatLastActivity(user.last_activity)}
        </Text>
        {user.current_session && (
          <Text style={styles.sessionInfo} numberOfLines={1}>
            Session: {user.current_session.substring(0, 8)}...
          </Text>
        )}
      </View>
    </View>
  );
}

export function ActiveUsersPanel({ users, loading = false }: ActiveUsersPanelProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color={auroraTheme.colors.primary[500]}
          />
          <Text style={styles.title}>Active Users</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const onlineCount = users.filter(u => u.status === "online").length;
  const idleCount = users.filter(u => u.status === "idle").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="account-group"
          size={20}
          color={auroraTheme.colors.primary[500]}
        />
        <Text style={styles.title}>Active Users</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{users.length}</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: auroraTheme.colors.success[500] }]} />
          <Text style={styles.summaryText}>{onlineCount} online</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: auroraTheme.colors.warning[500] }]} />
          <Text style={styles.summaryText}>{idleCount} idle</Text>
        </View>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="account-off"
            size={32}
            color={auroraTheme.colors.text.secondary}
          />
          <Text style={styles.emptyText}>No active users</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => <UserRow user={item} />}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    flex: 1,
  } as TextStyle,
  countBadge: {
    backgroundColor: auroraTheme.colors.primary[500] + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  } as ViewStyle,
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: auroraTheme.colors.primary[500],
  } as TextStyle,
  summary: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
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
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  list: {
    flex: 1,
  } as ViewStyle,
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light + "40",
  } as ViewStyle,
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  } as ViewStyle,
  avatarContainer: {
    position: "relative",
  } as ViewStyle,
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: auroraTheme.colors.background.secondary,
  } as ViewStyle,
  userDetails: {
    flex: 1,
  } as ViewStyle,
  username: {
    fontSize: 14,
    fontWeight: "500",
    color: auroraTheme.colors.text.primary,
  } as TextStyle,
  role: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  activityInfo: {
    alignItems: "flex-end",
  } as ViewStyle,
  lastActivity: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  sessionInfo: {
    fontSize: 10,
    color: auroraTheme.colors.primary[500],
    marginTop: 2,
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 14,
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  emptyText: {
    marginTop: 8,
    color: auroraTheme.colors.text.secondary,
    fontSize: 14,
  } as TextStyle,
});

export default ActiveUsersPanel;
