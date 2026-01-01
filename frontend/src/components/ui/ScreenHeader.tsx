/**
 * ScreenHeader Component - Reusable screen header with theme support
 *
 * Features:
 * - Username display from authStore
 * - Logout button with confirmation
 * - Theme-aware styling using useThemeContext
 * - Optional back button
 * - Optional title
 * - Safe area insets support
 * - Haptic feedback
 * - Animated transitions
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { useAuthStore } from "../../store/authStore";
import { useThemeContext } from "../../context/ThemeContext";

// ============================================================================
// Types
// ============================================================================

export interface ScreenHeaderProps {
  /** Optional title to display in the center */
  title?: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Show back button (defaults to false) */
  showBackButton?: boolean;
  /** Custom back button handler (defaults to router.back()) */
  onBackPress?: () => void;
  /** Show logout button (defaults to true) */
  showLogoutButton?: boolean;
  /** Show username (defaults to true) */
  showUsername?: boolean;
  /** Custom right action button */
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    label?: string;
  };
  /** Custom right content - renders any React element on the right side */
  customRightContent?: React.ReactNode;
  /** Additional style for the container */
  style?: ViewStyle;
  /** Use transparent background instead of blur */
  transparent?: boolean;
  /** Confirmation message for logout (set to null to skip confirmation) */
  logoutConfirmMessage?: string | null;
}

// ============================================================================
// Animated Button Component
// ============================================================================

interface AnimatedButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
  size?: number;
  testID?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  icon,
  iconColor,
  backgroundColor,
  size = 22,
  testID,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.actionButton, { backgroundColor }]}
        activeOpacity={0.8}
        testID={testID}
      >
        <Ionicons name={icon} size={size} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  showLogoutButton = true,
  showUsername = true,
  rightAction,
  customRightContent,
  style,
  transparent = false,
  logoutConfirmMessage = "Are you sure you want to logout?",
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useThemeContext();
  const { user, logout } = useAuthStore();

  const [leftSectionWidth, setLeftSectionWidth] = useState(0);
  const [rightSectionWidth, setRightSectionWidth] = useState(0);

  // Compute colors from theme
  const colors = {
    background: transparent
      ? "transparent"
      : isDark
        ? "rgba(15, 23, 42, 0.85)"
        : "rgba(255, 255, 255, 0.9)",
    text: theme.colors.text.primary,
    textSecondary: theme.colors.text.secondary,
    accent: theme.colors.accent,
    danger: theme.colors.danger,
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    buttonBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
  };

  // Handlers
  const handleBackPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  }, [onBackPress, router]);

  const handleLogout = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (logoutConfirmMessage === null) {
      // Skip confirmation
      logout();
      router.replace("/login");
      return;
    }

    Alert.alert("Logout", logoutConfirmMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }, [logout, router, logoutConfirmMessage]);

  const handleRightAction = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    rightAction?.onPress();
  }, [rightAction]);

  const handleLeftLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    setLeftSectionWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const handleRightLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    setRightSectionWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  // Render user info section
  const renderUserInfo = () => {
    if (!showUsername || !user) return null;

    return (
      <Animated.View entering={FadeIn.delay(100)} style={styles.userSection}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: `${theme.colors.accent}20` },
          ]}
        >
          <Ionicons name="person" size={16} color={theme.colors.accent} />
        </View>
        <View style={styles.userTextContainer}>
          <Text
            style={[styles.welcomeText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Welcome back
          </Text>
          <Text
            style={[styles.usernameText, { color: colors.text }]}
            numberOfLines={1}
          >
            {user.full_name || user.username}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Render title section
  const renderTitle = () => {
    if (!title) return null;

    return (
      <Animated.View entering={FadeIn.delay(50)} style={styles.titleSection}>
        <Text
          style={[styles.titleText, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitleText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    );
  };

  // Render content
  const renderContent = () => (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Left Section */}
      <View style={styles.leftSection} onLayout={handleLeftLayout}>
        {showBackButton && (
          <Animated.View entering={FadeInLeft.delay(50)}>
            <AnimatedButton
              onPress={handleBackPress}
              icon="chevron-back"
              iconColor={colors.text}
              backgroundColor={colors.buttonBg}
              size={24}
              testID="back-button"
            />
          </Animated.View>
        )}
        {!title && renderUserInfo()}
      </View>

      {/* Center Section (overlay-centered, avoids overlap with left/right content) */}
      {title && (
        <View
          pointerEvents="none"
          style={[
            styles.centerOverlay,
            {
              paddingLeft: leftSectionWidth + 12,
              paddingRight: rightSectionWidth + 12,
            },
          ]}
        >
          {renderTitle()}
        </View>
      )}

      {/* Right Section */}
      <Animated.View
        entering={FadeInRight.delay(100)}
        style={styles.rightSection}
        onLayout={handleRightLayout}
      >
        {customRightContent}
        {rightAction && (
          <AnimatedButton
            onPress={handleRightAction}
            icon={rightAction.icon}
            iconColor={colors.accent}
            backgroundColor={colors.buttonBg}
            testID="right-action-button"
          />
        )}
        {showLogoutButton && (
          <AnimatedButton
            onPress={handleLogout}
            icon="log-out-outline"
            iconColor={colors.danger}
            backgroundColor={colors.dangerBg}
            testID="logout-button"
          />
        )}
      </Animated.View>
    </View>
  );

  // Main render
  if (transparent) {
    return <View style={[styles.wrapper, style]}>{renderContent()}</View>;
  }

  return (
    <View style={[styles.wrapper, style]}>
      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={[styles.blurContainer, { borderBottomColor: colors.border }]}
      >
        {renderContent()}
      </BlurView>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },
  blurContainer: {
    borderBottomWidth: 1,
  },
  container: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 12,
  },
  centerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    gap: 8,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  usernameText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 1,
  },
  titleSection: {
    alignItems: "center",
    maxWidth: "100%",
  },
  titleText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    maxWidth: "100%",
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ScreenHeader;
