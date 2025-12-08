/**
 * Modern Card Component - Enhanced UI/UX
 * Features:
 * - Glassmorphism support
 * - Smooth hover/press animations
 * - Multiple elevation levels
 * - Gradient backgrounds
 * - Interactive states
 * - Better shadows and borders
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
  modernTypography,
  modernAnimations,
} from "../styles/modernDesignSystem";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export type CardVariant =
  | "default"
  | "elevated"
  | "glass"
  | "gradient"
  | "outlined";
export type CardElevation = "none" | "sm" | "md" | "lg";

interface ModernCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: number;
  style?: ViewStyle;
  gradientColors?: string[];
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  testID?: string;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  variant = "default",
  elevation = "md",
  padding = modernSpacing.cardPadding,
  style,
  gradientColors,
  icon,
  footer,
  testID,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Press handlers
  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, {
        damping: modernAnimations.easing.spring.damping,
        stiffness: modernAnimations.easing.spring.stiffness,
      });
      opacity.value = withTiming(0.9, {
        duration: modernAnimations.duration.fast,
      });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, {
        damping: modernAnimations.easing.spring.damping,
        stiffness: modernAnimations.easing.spring.stiffness,
      });
      opacity.value = withTiming(1, {
        duration: modernAnimations.duration.fast,
      });
    }
  };

  // Get card styles
  const getCardStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.card,
      padding,
      overflow: "hidden" as const,
    };

    // Elevation shadows
    const elevationShadows = {
      none: {},
      sm: modernShadows.sm,
      md: modernShadows.md,
      lg: modernShadows.lg,
    };

    // Variant styles
    const variantStyles: Record<CardVariant, ViewStyle> = {
      default: {
        backgroundColor: modernColors.background.paper,
        borderWidth: 1,
        borderColor: modernColors.border.light,
        ...elevationShadows[elevation],
      },
      elevated: {
        backgroundColor: modernColors.background.paper,
        ...elevationShadows[elevation],
      },
      glass: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      gradient: {
        backgroundColor: "transparent",
      },
      outlined: {
        backgroundColor: modernColors.background.paper,
        borderWidth: 2,
        borderColor: modernColors.border.medium,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  // Render card content
  const renderContent = () => {
    return (
      <View style={styles.content}>
        {(title || subtitle || icon) && (
          <View style={styles.header}>
            {icon && (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={icon}
                  size={24}
                  color={modernColors.primary[500]}
                />
              </View>
            )}
            <View style={styles.headerText}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
        )}

        <View style={styles.body}>{children}</View>

        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    );
  };

  // Render card based on variant
  const renderCard = () => {
    const cardStyle = [getCardStyles(), style];
    const Component = onPress ? AnimatedTouchableOpacity : AnimatedView;

    if (variant === "gradient") {
      const colors = gradientColors || modernColors.gradients.surface;
      return (
        <Component
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, cardStyle]}
          testID={testID}
        >
          <LinearGradient
            colors={colors as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {renderContent()}
          </LinearGradient>
        </Component>
      );
    }

    if (variant === "glass") {
      return (
        <Component
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, cardStyle]}
          testID={testID}
        >
          <BlurView intensity={20} tint="dark" style={styles.blur}>
            {renderContent()}
          </BlurView>
        </Component>
      );
    }

    return (
      <Component
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, cardStyle]}
        testID={testID}
      >
        {renderContent()}
      </Component>
    );
  };

  return renderCard();
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: modernSpacing.md,
  },
  iconContainer: {
    marginRight: modernSpacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  subtitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  body: {
    flex: 1,
  },
  footer: {
    marginTop: modernSpacing.md,
    paddingTop: modernSpacing.md,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  gradient: {
    flex: 1,
    padding: modernSpacing.cardPadding,
  },
  blur: {
    flex: 1,
    padding: modernSpacing.cardPadding,
  },
});

export default ModernCard;
