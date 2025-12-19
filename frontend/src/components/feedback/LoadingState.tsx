/**
 * LoadingState Component
 * Unified loading state management with multiple variants
 *
 * Features:
 * - Animated spinner with smooth transitions
 * - Customizable skeletons for content placeholders
 * - Full-screen overlay option
 * - Accessibility support
 * - Dark mode compatible
 */

import React, { useEffect } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  DimensionValue,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernAnimations,
} from "../../styles/modernDesignSystem";

// ==========================================
// LOADING SPINNER
// ==========================================

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "small" | "medium" | "large";
  /** Custom spinner color */
  color?: string;
  /** Message to display below spinner */
  message?: string;
  /** Show full-screen overlay */
  overlay?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  color,
  message,
  overlay = false,
  accessibilityLabel = "Loading",
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: modernAnimations.duration.normal,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withTiming(1, {
      duration: modernAnimations.duration.normal,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const spinnerSize = size === "small" ? 32 : size === "medium" ? 48 : 64;
  const spinnerColor = color || modernColors.primary[500];

  const containerStyle = overlay
    ? [styles.spinnerContainer, styles.spinnerOverlay]
    : styles.spinnerContainer;

  return (
    <Animated.View
      style={[containerStyle, animatedStyle]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size={spinnerSize} color={spinnerColor} />
      {message && (
        <Text
          style={[styles.spinnerMessage, { color: spinnerColor }]}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      )}
    </Animated.View>
  );
};

// ==========================================
// SKELETON LOADER
// ==========================================

interface SkeletonProps {
  /** Skeleton width */
  width?: DimensionValue;
  /** Skeleton height */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = modernBorderRadius.sm,
  style,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.4 * progress.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: modernColors.neutral[700],
        },
        animatedStyle,
        style,
      ]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
};

// ==========================================
// SKELETON LIST
// ==========================================

interface SkeletonListProps {
  /** Number of skeleton items */
  count?: number;
  /** Height of each item */
  itemHeight?: number;
  /** Spacing between items */
  spacing?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = 80,
  spacing = modernSpacing.md,
}) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.listItem,
            { marginBottom: spacing, height: itemHeight },
          ]}
        >
          <Skeleton
            width={60}
            height={60}
            borderRadius={modernBorderRadius.md}
          />
          <View style={styles.listItemContent}>
            <Skeleton
              width="70%"
              height={14}
              borderRadius={modernBorderRadius.sm}
            />
            <Skeleton
              width="50%"
              height={12}
              borderRadius={modernBorderRadius.sm}
              style={{ marginTop: modernSpacing.sm }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// ==========================================
// CARD SKELETON
// ==========================================

interface CardSkeletonProps {
  /** Number of skeleton cards */
  count?: number;
  /** Spacing between cards */
  spacing?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  count = 3,
  spacing = modernSpacing.md,
}) => {
  return (
    <View style={styles.cardContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.card,
            { marginBottom: index < count - 1 ? spacing : 0 },
          ]}
        >
          <Skeleton
            width="100%"
            height={120}
            borderRadius={modernBorderRadius.md}
          />
          <View style={styles.cardContent}>
            <Skeleton
              width="80%"
              height={16}
              borderRadius={modernBorderRadius.sm}
            />
            <Skeleton
              width="60%"
              height={14}
              borderRadius={modernBorderRadius.sm}
              style={{ marginTop: modernSpacing.sm }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// ==========================================
// LOADING STATE
// ==========================================

interface LoadingStateProps {
  message?: string;
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = "large",
  color = "#007AFF",
  fullScreen = false,
  overlay = false,
  containerStyle,
  textStyle,
}) => {
  const containerStyles: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    ...(fullScreen && {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
    }),
    ...(overlay && {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    }),
  };

  return (
    <View style={[containerStyles, containerStyle]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text
          style={[
            { marginTop: 12, fontSize: 16, color: overlay ? "#FFF" : "#666" },
            textStyle,
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  // Spinner styles
  spinnerContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.lg,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: modernColors.background.overlay,
    zIndex: 1000,
  },
  spinnerMessage: {
    ...modernTypography.body.medium,
    marginTop: modernSpacing.md,
    textAlign: "center",
  },

  // Skeleton styles
  skeleton: {
    backgroundColor: modernColors.neutral[700],
  },

  // List styles
  listContainer: {
    paddingHorizontal: modernSpacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  listItemContent: {
    flex: 1,
    marginLeft: modernSpacing.md,
  },

  // Card styles
  cardContainer: {
    paddingHorizontal: modernSpacing.md,
  },
  card: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: modernSpacing.md,
  },
});
