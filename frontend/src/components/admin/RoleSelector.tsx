/**
 * RoleSelector Component - Role assignment picker
 * Reusable component for selecting user roles in admin forms
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, textStyles, semanticColors } from "../../theme/unified";

// Role configurations with icons and colors
const ROLE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; description: string }> = {
  staff: {
    icon: "person-outline",
    color: colors.primary[500],
    description: "Basic access for inventory scanning and counting",
  },
  supervisor: {
    icon: "people-outline",
    color: colors.warning[500],
    description: "Can manage sessions and approve discrepancies",
  },
  admin: {
    icon: "shield-checkmark-outline",
    color: colors.error[500],
    description: "Full system access including user management",
  },
};

interface RoleSelectorProps {
  value: string;
  onChange: (role: string) => void;
  availableRoles?: string[];
  disabled?: boolean;
  showDescriptions?: boolean;
  variant?: "chips" | "cards" | "dropdown";
  style?: ViewStyle;
}

export function RoleSelector({
  value,
  onChange,
  availableRoles = ["staff", "supervisor", "admin"],
  disabled = false,
  showDescriptions = false,
  variant = "chips",
  style,
}: RoleSelectorProps) {
  if (variant === "cards") {
    return (
      <View style={[styles.cardsContainer, style]}>
        {availableRoles.map((role) => {
          const config = ROLE_CONFIG[role] || {
            icon: "person",
            color: colors.neutral[500],
            description: "",
          };
          const isSelected = value === role;

          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                disabled && styles.cardDisabled,
              ]}
              onPress={() => !disabled && onChange(role)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: isSelected ? config.color : semanticColors.background.tertiary },
                ]}
              >
                <Ionicons
                  name={config.icon}
                  size={24}
                  color={isSelected ? "#fff" : config.color}
                />
              </View>
              <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
              {showDescriptions && config.description && (
                <Text style={styles.cardDescription}>{config.description}</Text>
              )}
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success[500]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Default: Chips variant
  return (
    <View style={[styles.chipsContainer, style]}>
      {availableRoles.map((role) => {
        const config = ROLE_CONFIG[role] || {
          icon: "person",
          color: colors.neutral[500],
          description: "",
        };
        const isSelected = value === role;

        return (
          <TouchableOpacity
            key={role}
            style={[
              styles.chip,
              isSelected && [styles.chipSelected, { borderColor: config.color }],
              disabled && styles.chipDisabled,
            ]}
            onPress={() => !disabled && onChange(role)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons
              name={config.icon}
              size={16}
              color={isSelected ? config.color : semanticColors.text.secondary}
            />
            <Text
              style={[
                styles.chipText,
                isSelected && [styles.chipTextSelected, { color: config.color }],
              ]}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Role Badge - for displaying role in read-only contexts
interface RoleBadgeProps {
  role: string;
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  style?: ViewStyle;
}

export function RoleBadge({
  role,
  size = "medium",
  showIcon = true,
  style,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] || {
    icon: "person",
    color: colors.neutral[500],
    description: "",
  };

  const sizeStyles = {
    small: { paddingHorizontal: spacing.sm, paddingVertical: 2, iconSize: 12, fontSize: 10 },
    medium: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, iconSize: 14, fontSize: 12 },
    large: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, iconSize: 16, fontSize: 14 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${config.color}15`,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons name={config.icon} size={s.iconSize} color={config.color} />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: config.color, fontSize: s.fontSize },
        ]}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </View>
  );
}

// Permission List - shows what a role can do
interface RolePermissionsProps {
  role: string;
  style?: ViewStyle;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  staff: [
    "View assigned sessions",
    "Scan and count items",
    "Report discrepancies",
    "View own history",
  ],
  supervisor: [
    "All Staff permissions",
    "Create and manage sessions",
    "Assign staff to sessions",
    "Review discrepancies",
    "Generate session reports",
  ],
  admin: [
    "All Supervisor permissions",
    "Manage users and roles",
    "Configure system settings",
    "View audit logs",
    "Access security features",
    "Manage ERP integration",
  ],
};

export function RolePermissions({ role, style }: RolePermissionsProps) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  const config = ROLE_CONFIG[role] || {
    icon: "person",
    color: colors.neutral[500],
    description: "",
  };

  return (
    <View style={[styles.permissionsContainer, style]}>
      <View style={styles.permissionsHeader}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={styles.permissionsTitle}>
          {role.charAt(0).toUpperCase() + role.slice(1)} Permissions
        </Text>
      </View>
      <View style={styles.permissionsList}>
        {permissions.map((permission, index) => (
          <View key={index} style={styles.permissionItem}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success[500]}
            />
            <Text style={styles.permissionText}>{permission}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Chips variant
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    backgroundColor: semanticColors.background.secondary,
  },
  chipSelected: {
    backgroundColor: semanticColors.background.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...textStyles.label,
    color: semanticColors.text.secondary,
  },
  chipTextSelected: {
    fontWeight: "600",
  },

  // Cards variant
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: semanticColors.border.default,
    backgroundColor: semanticColors.background.secondary,
    alignItems: "center",
    position: "relative",
  },
  cardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: semanticColors.background.primary,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: semanticColors.text.primary,
    marginBottom: spacing.xs,
  },
  cardTitleSelected: {
    color: colors.primary[700],
  },
  cardDescription: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontWeight: "600",
  },

  // Permissions
  permissionsContainer: {
    backgroundColor: semanticColors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  permissionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border.default,
  },
  permissionsTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: semanticColors.text.primary,
  },
  permissionsList: {
    gap: spacing.sm,
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  permissionText: {
    ...textStyles.body,
    color: semanticColors.text.secondary,
    flex: 1,
  },
});

export default RoleSelector;
