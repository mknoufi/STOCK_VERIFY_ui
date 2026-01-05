/**
 * Modern Users Management Screen
 * Enhanced UI with bulk operations, filters, and real-time search
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { colors, spacing } from "@/theme/unified";
import { adminApi } from "@/services/api";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

type UserRole = "admin" | "supervisor" | "staff";
type UserStatus = "active" | "inactive";
type FilterTab = "all" | "admin" | "supervisor" | "staff";

interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  lastActive?: string;
  sessionsCount?: number;
  accuracy?: number;
  createdAt: string;
}

export default function ModernUsersManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "role" | "activity">("name");

  const loadUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminApi.getActiveUsers();
      
      if (response) {
        // Transform active users data to full user format
        const formattedUsers: User[] = response.map((u: any) => ({
          id: u.user_id || u.id,
          username: u.username,
          email: `${u.username}@example.com`,
          role: u.role as UserRole,
          status: u.status === "online" || u.status === "idle" ? "active" : "inactive",
          lastActive: u.last_activity,
          sessionsCount: 0,
          accuracy: 100,
          createdAt: new Date().toISOString(),
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by role tab
    if (activeTab !== "all") {
      filtered = filtered.filter((u) => u.role === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.username.localeCompare(b.username);
        case "role":
          return a.role.localeCompare(b.role);
        case "activity":
          return (b.sessionsCount || 0) - (a.sessionsCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [users, activeTab, searchQuery, sortBy]);

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleBulkAction = (action: "activate" | "deactivate" | "delete") => {
    if (selectedUsers.size === 0) {
      Alert.alert("No Selection", "Please select users first");
      return;
    }

    const count = selectedUsers.size;
    const actionText = action === "activate" ? "activate" : action === "deactivate" ? "deactivate" : "delete";
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Users`,
      `Are you sure you want to ${actionText} ${count} user(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: action === "delete" ? "destructive" : "default",
          onPress: async () => {
            // Implement bulk action logic
            console.log(`Bulk ${action}:`, Array.from(selectedUsers));
            setSelectedUsers(new Set());
          },
        },
      ]
    );
  };

  const tabOptions: { value: FilterTab; label: string; icon: string }[] = [
    { value: "all", label: "All", icon: "people" },
    { value: "admin", label: "Admins", icon: "shield-checkmark" },
    { value: "supervisor", label: "Supervisors", icon: "star" },
    { value: "staff", label: "Staff", icon: "person" },
  ];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return colors.error[500];
      case "supervisor":
        return colors.warning[500];
      case "staff":
        return colors.info[500];
      default:
        return colors.neutral[500];
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(true)}
            tintColor={colors.primary[400]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Users Management</Text>
            <Text style={styles.subtitle}>{users.length} total users</Text>
          </View>
          <AnimatedPressable
            style={styles.addButton}
            onPress={() => router.push("/admin/create-user")}
          >
            <Ionicons name="add" size={20} color={colors.neutral[100]} />
            <Text style={styles.addButtonText}>Add User</Text>
          </AnimatedPressable>
        </View>

        {/* Search Bar */}
        <GlassCard variant="medium" style={styles.searchCard}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.neutral[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </AnimatedPressable>
          )}
        </GlassCard>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabOptions.map((tab) => (
            <AnimatedPressable
              key={tab.value}
              style={[
                styles.tab,
                activeTab === tab.value && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.value ? colors.neutral[50] : colors.neutral[400]}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.value && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.bulkActionsBar}>
            <Text style={styles.bulkActionsText}>
              {selectedUsers.size} selected
            </Text>
            <View style={styles.bulkActionsButtons}>
              <AnimatedPressable
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction("activate")}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.success[400]} />
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction("deactivate")}
              >
                <Ionicons name="pause-circle" size={18} color={colors.warning[400]} />
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction("delete")}
              >
                <Ionicons name="trash" size={18} color={colors.error[400]} />
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.bulkActionButton}
                onPress={() => setSelectedUsers(new Set())}
              >
                <Ionicons name="close" size={18} color={colors.neutral[400]} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {["name", "role", "activity"].map((option) => (
            <AnimatedPressable
              key={option}
              style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option as any)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option && styles.sortButtonTextActive,
                ]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Users List */}
        <View style={styles.usersList}>
          {filteredUsers.map((user, index) => (
            <Animated.View
              key={user.id}
              entering={FadeInDown.delay(index * 50).duration(400)}
            >
              <GlassCard variant="medium" style={styles.userCard}>
                <AnimatedPressable
                  style={styles.userCardContent}
                  onPress={() => router.push(`/admin/users/${user.id}`)}
                  onLongPress={() => toggleUserSelection(user.id)}
                >
                  {/* Checkbox */}
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    {selectedUsers.has(user.id) ? (
                      <Ionicons name="checkbox" size={24} color={colors.primary[400]} />
                    ) : (
                      <Ionicons name="square-outline" size={24} color={colors.neutral[500]} />
                    )}
                  </TouchableOpacity>

                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) }]}>
                    <Text style={styles.avatarText}>
                      {user.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* User Info */}
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.username}>{user.username}</Text>
                      {user.status === "inactive" && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    {user.email && <Text style={styles.email}>{user.email}</Text>}
                    <View style={styles.userMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + "30" }]}>
                        <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                          {user.role}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>
                        {user.sessionsCount || 0} sessions
                      </Text>
                      {user.accuracy !== undefined && (
                        <Text style={styles.metaText}>
                          {user.accuracy}% accuracy
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Actions */}
                  <AnimatedPressable
                    style={styles.userActionButton}
                    onPress={() => console.log("Edit user", user.id)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.neutral[400]} />
                  </AnimatedPressable>
                </AnimatedPressable>
              </GlassCard>
            </Animated.View>
          ))}
        </View>

        {filteredUsers.length === 0 && (
          <GlassCard variant="medium" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.neutral[600]} />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search query"
                : "Add your first user to get started"}
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.neutral[50],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral[400],
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.neutral[100],
  },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[100],
  },
  tabsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary[600],
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.neutral[400],
  },
  tabTextActive: {
    color: colors.neutral[50],
  },
  bulkActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primary[900] + "CC",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.neutral[100],
  },
  bulkActionsButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bulkActionButton: {
    padding: spacing.xs,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.neutral[400],
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sortButtonActive: {
    backgroundColor: colors.primary[600] + "40",
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.neutral[400],
  },
  sortButtonTextActive: {
    color: colors.primary[300],
  },
  usersList: {
    gap: spacing.md,
  },
  userCard: {
    padding: spacing.md,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkbox: {
    padding: spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.neutral[50],
  },
  userInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.neutral[100],
  },
  email: {
    fontSize: 13,
    color: colors.neutral[400],
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metaText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  inactiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.neutral[700],
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.neutral[400],
  },
  userActionButton: {
    padding: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.neutral[300],
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: "center",
  },
});
