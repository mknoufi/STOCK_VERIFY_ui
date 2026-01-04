/**
 * User Management Screen
 * Admin panel for managing users - list, create, edit, delete
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  LoadingSpinner,
  AnimatedPressable,
  ScreenContainer,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";
import apiClient from "../../src/services/httpClient";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

// Typography helper
const textStyles = {
  h2: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize["2xl"],
    fontWeight: "700" as const,
  },
  h3: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "600" as const,
  },
  body: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.base,
  },
  label: {
    fontFamily: auroraTheme.typography.fontFamily.label,
    fontSize: auroraTheme.typography.fontSize.sm,
  },
  caption: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.xs,
  },
};

// Types
interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  role: "staff" | "supervisor" | "admin";
  isActive: boolean;
  createdAt: string | null;
  lastLogin: string | null;
  permissionsCount: number;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SortField = "username" | "email" | "role" | "created_at";
type SortOrder = "asc" | "desc";

// Role badge colors
const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case "admin":
      return {
        bg: auroraTheme.colors.error[100],
        text: auroraTheme.colors.error[700],
      };
    case "supervisor":
      return {
        bg: auroraTheme.colors.warning[100],
        text: auroraTheme.colors.warning[700],
      };
    default:
      return {
        bg: auroraTheme.colors.primary[100],
        text: auroraTheme.colors.primary[700],
      };
  }
};

// Status badge
const getStatusStyle = (isActive: boolean) => {
  return isActive
    ? {
        bg: auroraTheme.colors.success[100],
        text: auroraTheme.colors.success[700],
      }
    : {
        bg: auroraTheme.colors.neutral[200],
        text: auroraTheme.colors.neutral[600],
      };
};

export default function UsersScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("username");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [, setShowCreateModal] = useState(false);
  const [, setEditingUser] = useState<User | null>(null);

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (search) params.append("search", search);
        if (roleFilter) params.append("role", roleFilter);
        if (activeFilter !== null)
          params.append("is_active", activeFilter.toString());

        const response = await apiClient.get<UserListResponse>(
          `/users?${params.toString()}`,
        );

        if (response.data) {
          // Normalize snake_case to camelCase
          const data = response.data as any;
          const normalizedUsers = (data.users || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.full_name,
            role: u.role,
            isActive: u.is_active,
            createdAt: u.created_at,
            lastLogin: u.last_login,
            permissionsCount: u.permissions_count,
          }));
          setUsers(normalizedUsers);
          setTotal(data.total || 0);
          setTotalPages(data.total_pages || 1);
        }
      } catch (error: any) {
        if (!isRefresh) {
          Alert.alert("Error", error.message || "Failed to load users");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, sortBy, sortOrder, search, roleFilter, activeFilter],
  );

  // Check permissions
  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to manage users.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadUsers();
  }, [loadUsers, hasRole, router]);

  const onRefresh = useCallback(() => {
    loadUsers(true);
  }, [loadUsers]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkAction = async (
    action: "activate" | "deactivate" | "delete",
  ) => {
    if (selectedUsers.size === 0) {
      Alert.alert("No Selection", "Please select users first.");
      return;
    }

    const actionText = action === "delete" ? "delete" : action;
    const confirmText =
      action === "delete"
        ? `Are you sure you want to delete ${selectedUsers.size} user(s)? This cannot be undone.`
        : `Are you sure you want to ${actionText} ${selectedUsers.size} user(s)?`;

    Alert.alert(`Confirm ${actionText}`, confirmText, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: action === "delete" ? "destructive" : "default",
        onPress: async () => {
          try {
            await apiClient.post("/users/bulk", {
              user_ids: Array.from(selectedUsers),
              action,
            });
            setSelectedUsers(new Set());
            loadUsers();
            Alert.alert(
              "Success",
              `Successfully ${actionText}d ${selectedUsers.size} user(s)`,
            );
          } catch (error: any) {
            Alert.alert(
              "Error",
              error.message || `Failed to ${actionText} users`,
            );
          }
        },
      },
    ]);
  };

  const handleDeleteUser = async (user: User) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete "${user.username}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/users/${user.id}`);
              loadUsers();
              Alert.alert("Success", `User "${user.username}" deleted`);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete user");
            }
          },
        },
      ],
    );
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? "deactivate" : "activate";
    try {
      await apiClient.put(`/users/${user.id}`, { is_active: !user.isActive });
      loadUsers();
    } catch (error: any) {
      Alert.alert("Error", error.message || `Failed to ${action} user`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // Render filter bar
  const renderFilters = () => (
    <View style={styles.filterBar}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={auroraTheme.colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={auroraTheme.colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={auroraTheme.colors.neutral[400]}
            />
          </AnimatedPressable>
        )}
      </View>

      {/* Role Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Role:</Text>
        <View style={styles.filterButtons}>
          <AnimatedPressable
            style={[
              styles.filterButton,
              !roleFilter && styles.filterButtonActive,
            ]}
            onPress={() => setRoleFilter(null)}
          >
            <Text
              style={[
                styles.filterButtonText,
                !roleFilter && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </AnimatedPressable>
          {["staff", "supervisor", "admin"].map((role) => (
            <AnimatedPressable
              key={role}
              style={[
                styles.filterButton,
                roleFilter === role && styles.filterButtonActive,
              ]}
              onPress={() => setRoleFilter(roleFilter === role ? null : role)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  roleFilter === role && styles.filterButtonTextActive,
                ]}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.filterButtons}>
          <AnimatedPressable
            style={[
              styles.filterButton,
              activeFilter === null && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(null)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === null && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[
              styles.filterButton,
              activeFilter === true && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(activeFilter === true ? null : true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === true && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[
              styles.filterButton,
              activeFilter === false && styles.filterButtonActive,
            ]}
            onPress={() =>
              setActiveFilter(activeFilter === false ? null : false)
            }
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === false && styles.filterButtonTextActive,
              ]}
            >
              Inactive
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );

  // Render bulk actions
  const renderBulkActions = () => {
    if (selectedUsers.size === 0) return null;

    return (
      <View style={styles.bulkActions}>
        <Text style={styles.bulkText}>{selectedUsers.size} selected</Text>
        <View style={styles.bulkButtons}>
          <AnimatedPressable
            style={[styles.bulkButton, styles.bulkButtonSuccess]}
            onPress={() => handleBulkAction("activate")}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.bulkButtonText}>Activate</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.bulkButton, styles.bulkButtonWarning]}
            onPress={() => handleBulkAction("deactivate")}
          >
            <Ionicons name="pause-circle" size={16} color="#fff" />
            <Text style={styles.bulkButtonText}>Deactivate</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.bulkButton, styles.bulkButtonDanger]}
            onPress={() => handleBulkAction("delete")}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.bulkButtonText}>Delete</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  // Render table header
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <AnimatedPressable style={styles.checkboxCell} onPress={handleSelectAll}>
        <Ionicons
          name={
            selectedUsers.size === users.length && users.length > 0
              ? "checkbox"
              : "square-outline"
          }
          size={20}
          color={auroraTheme.colors.primary[600]}
        />
      </AnimatedPressable>
      <AnimatedPressable
        style={[styles.headerCell, styles.usernameCell]}
        onPress={() => handleSort("username")}
      >
        <Text style={styles.headerText}>Username</Text>
        {sortBy === "username" && (
          <Ionicons
            name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
            size={14}
            color={auroraTheme.colors.primary[600]}
          />
        )}
      </AnimatedPressable>
      <AnimatedPressable
        style={[styles.headerCell, styles.emailCell]}
        onPress={() => handleSort("email")}
      >
        <Text style={styles.headerText}>Email</Text>
        {sortBy === "email" && (
          <Ionicons
            name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
            size={14}
            color={auroraTheme.colors.primary[600]}
          />
        )}
      </AnimatedPressable>
      <AnimatedPressable
        style={[styles.headerCell, styles.roleCell]}
        onPress={() => handleSort("role")}
      >
        <Text style={styles.headerText}>Role</Text>
        {sortBy === "role" && (
          <Ionicons
            name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
            size={14}
            color={auroraTheme.colors.primary[600]}
          />
        )}
      </AnimatedPressable>
      <View style={[styles.headerCell, styles.statusCell]}>
        <Text style={styles.headerText}>Status</Text>
      </View>
      <AnimatedPressable
        style={[styles.headerCell, styles.dateCell]}
        onPress={() => handleSort("created_at")}
      >
        <Text style={styles.headerText}>Created</Text>
        {sortBy === "created_at" && (
          <Ionicons
            name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
            size={14}
            color={auroraTheme.colors.primary[600]}
          />
        )}
      </AnimatedPressable>
      <View style={[styles.headerCell, styles.actionsCell]}>
        <Text style={styles.headerText}>Actions</Text>
      </View>
    </View>
  );

  // Render user row
  const renderUserRow = (user: User) => {
    const roleBadge = getRoleBadgeStyle(user.role);
    const statusBadge = getStatusStyle(user.isActive);
    const isSelected = selectedUsers.has(user.id);

    return (
      <View
        key={user.id}
        style={[styles.tableRow, isSelected && styles.tableRowSelected]}
      >
        <AnimatedPressable
          style={styles.checkboxCell}
          onPress={() => handleSelectUser(user.id)}
        >
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={20}
            color={auroraTheme.colors.primary[600]}
          />
        </AnimatedPressable>
        <View style={[styles.cell, styles.usernameCell]}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.username}>{user.username}</Text>
              {user.fullName && (
                <Text style={styles.fullName}>{user.fullName}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.cell, styles.emailCell]}>
          <Text style={styles.cellText}>{user.email || "-"}</Text>
        </View>
        <View style={[styles.cell, styles.roleCell]}>
          <View style={[styles.badge, { backgroundColor: roleBadge.bg }]}>
            <Text style={[styles.badgeText, { color: roleBadge.text }]}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </View>
        </View>
        <View style={[styles.cell, styles.statusCell]}>
          <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.badgeText, { color: statusBadge.text }]}>
              {user.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={styles.cellText}>{formatDate(user.createdAt)}</Text>
        </View>
        <View style={[styles.cell, styles.actionsCell]}>
          <View style={styles.actionButtons}>
            <AnimatedPressable
              style={styles.actionButton}
              onPress={() => setEditingUser(user)}
            >
              <Ionicons name="pencil" size={18} color={auroraTheme.colors.primary[600]} />
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.actionButton}
              onPress={() => handleToggleStatus(user)}
            >
              <Ionicons
                name={
                  user.isActive ? "pause-circle-outline" : "play-circle-outline"
                }
                size={18}
                color={
                  user.isActive ? auroraTheme.colors.warning[600] : auroraTheme.colors.success[600]
                }
              />
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.actionButton}
              onPress={() => handleDeleteUser(user)}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={auroraTheme.colors.error[600]}
              />
            </AnimatedPressable>
          </View>
        </View>
      </View>
    );
  };

  // Render pagination
  const renderPagination = () => (
    <View style={styles.pagination}>
      <Text style={styles.paginationText}>
        Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)}{" "}
        of {total}
      </Text>
      <View style={styles.paginationButtons}>
        <AnimatedPressable
          style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
          onPress={() => page > 1 && setPage(page - 1)}
          disabled={page === 1}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={page === 1 ? auroraTheme.colors.neutral[300] : auroraTheme.colors.primary[600]}
          />
        </AnimatedPressable>
        <Text style={styles.pageNumber}>
          Page {page} of {totalPages}
        </Text>
        <AnimatedPressable
          style={[
            styles.pageButton,
            page === totalPages && styles.pageButtonDisabled,
          ]}
          onPress={() => page < totalPages && setPage(page + 1)}
          disabled={page === totalPages}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              page === totalPages ? auroraTheme.colors.neutral[300] : auroraTheme.colors.primary[600]
            }
          />
        </AnimatedPressable>
      </View>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <ScreenContainer>
        <LoadingSpinner isVisible={true} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Ionicons name="people" size={28} color={auroraTheme.colors.primary[600]} />
            <Text style={styles.title}>User Management</Text>
          </View>
          <AnimatedPressable
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Add User</Text>
          </AnimatedPressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {users.filter((u) => u.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {users.filter((u) => u.role === "admin").length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
        </View>

        {/* Filters */}
        {renderFilters()}

        {/* Bulk Actions */}
        {renderBulkActions()}

        {/* Table */}
        <View style={styles.tableContainer}>
          {isWeb || isTablet ? (
            <>
              {renderTableHeader()}
              {users.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={auroraTheme.colors.neutral[300]}
                  />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                users.map(renderUserRow)
              )}
            </>
          ) : // Mobile card layout
          users.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={48}
                color={auroraTheme.colors.neutral[300]}
              />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            users.map((user) => {
              const roleBadge = getRoleBadgeStyle(user.role);
              const statusBadge = getStatusStyle(user.isActive);
              return (
                <View key={user.id} style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {user.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.username}>{user.username}</Text>
                        {user.email && (
                          <Text style={styles.mobileEmail}>{user.email}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.mobileBadges}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: roleBadge.bg },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: roleBadge.text }]}
                        >
                          {user.role}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: statusBadge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: statusBadge.text },
                          ]}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.mobileCardActions}>
                    <AnimatedPressable
                      style={styles.mobileAction}
                      onPress={() => setEditingUser(user)}
                    >
                      <Ionicons
                        name="pencil"
                        size={18}
                        color={auroraTheme.colors.primary[600]}
                      />
                      <Text style={styles.mobileActionText}>Edit</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={styles.mobileAction}
                      onPress={() => handleToggleStatus(user)}
                    >
                      <Ionicons
                        name={user.isActive ? "pause-circle" : "play-circle"}
                        size={18}
                        color={
                          user.isActive
                            ? auroraTheme.colors.warning[600]
                            : auroraTheme.colors.success[600]
                        }
                      />
                      <Text style={styles.mobileActionText}>
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={styles.mobileAction}
                      onPress={() => handleDeleteUser(user)}
                    >
                      <Ionicons
                        name="trash"
                        size={18}
                        color={auroraTheme.colors.error[600]}
                      />
                      <Text
                        style={[
                          styles.mobileActionText,
                          { color: auroraTheme.colors.error[600] },
                        ]}
                      >
                        Delete
                      </Text>
                    </AnimatedPressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Pagination */}
        {total > pageSize && renderPagination()}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: auroraTheme.colors.background.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  title: {
    ...textStyles.h2,
    color: auroraTheme.colors.text.primary,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    backgroundColor: auroraTheme.colors.primary[600],
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
    borderRadius: auroraTheme.borderRadius.md,
  },
  createButtonText: {
    ...textStyles.label,
    color: "#fff",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: auroraTheme.spacing.lg,
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: auroraTheme.colors.background.secondary,
    padding: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    ...textStyles.h3,
    color: auroraTheme.colors.primary[600],
  },
  statLabel: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
    marginTop: auroraTheme.spacing.xs,
  },
  filterBar: {
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
    backgroundColor: auroraTheme.colors.background.secondary,
    marginBottom: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.background.primary,
    borderRadius: auroraTheme.borderRadius.md,
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: auroraTheme.spacing.xs,
    gap: auroraTheme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: auroraTheme.colors.text.primary,
    padding: auroraTheme.spacing.xs,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    flexWrap: "wrap",
  },
  filterLabel: {
    ...textStyles.label,
    color: auroraTheme.colors.text.secondary,
  },
  filterButtons: {
    flexDirection: "row",
    gap: auroraTheme.spacing.xs,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: auroraTheme.spacing.xs,
    borderRadius: auroraTheme.borderRadius.md,
    backgroundColor: auroraTheme.colors.background.primary,
    borderWidth: 1,
    borderColor: auroraTheme.colors.neutral[200],
  },
  filterButtonActive: {
    backgroundColor: auroraTheme.colors.primary[100],
    borderColor: auroraTheme.colors.primary[300],
  },
  filterButtonText: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
  },
  filterButtonTextActive: {
    color: auroraTheme.colors.primary[700],
    fontWeight: "600",
  },
  bulkActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.sm,
    backgroundColor: auroraTheme.colors.primary[50],
    marginHorizontal: auroraTheme.spacing.lg,
    marginBottom: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
  },
  bulkText: {
    ...textStyles.label,
    color: auroraTheme.colors.primary[700],
    fontWeight: "600",
  },
  bulkButtons: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: auroraTheme.spacing.xs,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  bulkButtonSuccess: {
    backgroundColor: auroraTheme.colors.success[600],
  },
  bulkButtonWarning: {
    backgroundColor: auroraTheme.colors.warning[600],
  },
  bulkButtonDanger: {
    backgroundColor: auroraTheme.colors.error[600],
  },
  bulkButtonText: {
    ...textStyles.caption,
    color: "#fff",
    fontWeight: "600",
  },
  tableContainer: {
    marginHorizontal: auroraTheme.spacing.lg,
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: auroraTheme.borderRadius.lg,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: auroraTheme.colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.neutral[200],
    paddingVertical: auroraTheme.spacing.sm,
  },
  headerCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    paddingHorizontal: auroraTheme.spacing.sm,
  },
  headerText: {
    ...textStyles.label,
    color: auroraTheme.colors.text.secondary,
    fontWeight: "600",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.neutral[100],
    paddingVertical: auroraTheme.spacing.sm,
    alignItems: "center",
  },
  tableRowSelected: {
    backgroundColor: auroraTheme.colors.primary[50],
  },
  cell: {
    paddingHorizontal: auroraTheme.spacing.sm,
  },
  cellText: {
    ...textStyles.body,
    color: auroraTheme.colors.text.primary,
  },
  checkboxCell: {
    width: 40,
    alignItems: "center",
  },
  usernameCell: {
    flex: 2,
    minWidth: 150,
  },
  emailCell: {
    flex: 2,
    minWidth: 180,
  },
  roleCell: {
    flex: 1,
    minWidth: 100,
  },
  statusCell: {
    flex: 1,
    minWidth: 80,
  },
  dateCell: {
    flex: 1,
    minWidth: 100,
  },
  actionsCell: {
    width: 120,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: auroraTheme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...textStyles.label,
    color: auroraTheme.colors.primary[700],
    fontWeight: "700",
  },
  username: {
    ...textStyles.body,
    color: auroraTheme.colors.text.primary,
    fontWeight: "600",
  },
  fullName: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
  },
  badge: {
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  badgeText: {
    ...textStyles.caption,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: auroraTheme.spacing.xs,
  },
  actionButton: {
    padding: auroraTheme.spacing.xs,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  emptyState: {
    padding: auroraTheme.spacing["2xl"],
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  emptyText: {
    ...textStyles.body,
    color: auroraTheme.colors.text.tertiary,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
  },
  paginationText: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
  },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  pageButton: {
    padding: auroraTheme.spacing.xs,
    borderRadius: auroraTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: auroraTheme.colors.neutral[200],
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumber: {
    ...textStyles.label,
    color: auroraTheme.colors.text.primary,
  },
  mobileCard: {
    backgroundColor: auroraTheme.colors.background.primary,
    margin: auroraTheme.spacing.sm,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.neutral[100],
  },
  mobileCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.md,
  },
  mobileBadges: {
    flexDirection: "row",
    gap: auroraTheme.spacing.xs,
  },
  mobileEmail: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
  },
  mobileCardActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.neutral[100],
    paddingTop: auroraTheme.spacing.sm,
  },
  mobileAction: {
    alignItems: "center",
    gap: 2,
  },
  mobileActionText: {
    ...textStyles.caption,
    color: auroraTheme.colors.text.secondary,
  },
});
