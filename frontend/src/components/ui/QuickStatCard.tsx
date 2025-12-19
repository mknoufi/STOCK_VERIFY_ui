/**
 * QuickStatCard Component - Modern statistics display
 * Features:
 * - Animated counter
 * - Gradient background option
 * - Icon with glow
 * - Trend indicator
 * - Multiple size variants
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeInUp,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

type TrendDirection = "up" | "down" | "neutral";
type CardVariant = "default" | "gradient" | "outline";

interface QuickStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: {
    direction: TrendDirection;
    value: string;
    label?: string;
  };
  variant?: CardVariant;
  gradientColors?: string[];
  onPress?: () => void;
  suffix?: string;
  prefix?: string;
  animate?: boolean;
  style?: ViewStyle;
  index?: number;
}

const trendConfig: Record<
  TrendDirection,
  { color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  up: { color: modernColors.success.main, icon: "trending-up" },
  down: { color: modernColors.error.main, icon: "trending-down" },
  neutral: { color: modernColors.text.tertiary, icon: "remove" },
};

export const QuickStatCard: React.FC<QuickStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = modernColors.primary[400],
  trend,
  variant = "default",
  gradientColors,
  onPress,
  suffix,
  prefix,
  animate = true,
  style,
  index = 0,
}) => {
  const scale = useSharedValue(1);
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState(
    typeof value === "number" ? 0 : value,
  );

  // Animate counter
  useEffect(() => {
    if (animate && typeof value === "number") {
      animatedValue.value = withTiming(
        value,
        { duration: 1000 },
        (finished) => {
          if (finished) {
            runOnJS(setDisplayValue)(value);
          }
        },
      );

      // Update display value during animation
      const interval = setInterval(() => {
        const current = Math.round(animatedValue.value);
        setDisplayValue(current);
      }, 50);

      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
      return undefined;
    }
  }, [value, animate, animatedValue]);
  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderContent = () => (
    <View style={styles.content}>
      {/* Icon */}
      {icon && (
        <View
          style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}
        >
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {prefix}
            {typeof displayValue === "number"
              ? displayValue.toLocaleString()
              : displayValue}
            {suffix}
          </Text>
        </View>

        {/* Subtitle */}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Trend */}
        {trend && (
          <View
            style={[
              styles.trendContainer,
              { backgroundColor: `${trendConfig[trend.direction].color}15` },
            ]}
          >
            <Ionicons
              name={trendConfig[trend.direction].icon}
              size={12}
              color={trendConfig[trend.direction].color}
            />
            <Text
              style={[
                styles.trendValue,
                { color: trendConfig[trend.direction].color },
              ]}
            >
              {trend.value}
            </Text>
            {trend.label && (
              <Text style={styles.trendLabel}>{trend.label}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const containerStyle = [
    styles.container,
    variant === "outline" && styles.outlineContainer,
    style,
  ];

  const card =
    variant === "gradient" ? (
      <LinearGradient
        colors={
          (gradientColors as [string, string, ...string[]]) ||
          ([modernColors.primary[600], modernColors.primary[500]] as [
            string,
            string,
          ])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, styles.gradientContainer, style]}
      >
        {renderContent()}
      </LinearGradient>
    ) : (
      <View style={containerStyle}>{renderContent()}</View>
    );

  if (onPress) {
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 75).springify()}
        style={animatedStyle}
      >
        <AnimatedTouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {card}
        </AnimatedTouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(index * 75).springify()}>
      {card}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    ...modernShadows.sm,
  },
  gradientContainer: {
    borderWidth: 0,
  },
  outlineContainer: {
    backgroundColor: "transparent",
    borderColor: "rgba(99, 102, 241, 0.3)",
    borderWidth: 1.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
  },
  subtitle: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
    fontWeight: "700",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: modernBorderRadius.full,
    marginTop: 4,
  },
  trendValue: {
    ...modernTypography.label.small,
    fontWeight: "600",
  },
  trendLabel: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
});

export default QuickStatCard;
