/**
 * AppHeader Component - Global header bar for all screens
 * Replaces custom headers with consistent, accessible header
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { layout, spacing, typography } from "../../styles/globalStyles";
import { useAuthStore } from "../../store/authStore";

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  color?: string;
}

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showUser?: boolean;
  actions?: HeaderAction[];
  onSearchPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  showUser = false,
  actions = [],
  onSearchPress,
  style,
  testID,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  // Calculate header height including safe area
  const headerHeight =
    layout.headerHeight + (Platform.OS === "ios" ? insets.top : 0);
  const paddingTop = Platform.OS === "ios" ? insets.top : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          height: headerHeight,
          paddingTop: paddingTop,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.contentContainer}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Navigates to the previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {showUser && user && (
              <Text
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              >
                Hello, {user.full_name || user.username}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {onSearchPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSearchPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search"
              accessibilityHint="Opens search"
            >
              <Ionicons name="search" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.color || theme.colors.text}
              />
              {action.badge !== undefined && action.badge > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.error },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? "99+" : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "center",
    borderBottomWidth: 1,
    ...(Platform.OS === "web"
      ? {
          position: "sticky" as const,
          top: 0,
          zIndex: 100,
        }
      : {}),
  } as any,
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: layout.headerHeight,
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  title: {
    ...typography.h5,
  },
  subtitle: {
    ...typography.caption,
    marginTop: -2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
