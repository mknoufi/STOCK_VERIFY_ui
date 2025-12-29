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
  StyleProp,
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
import { useThemeContextSafe } from "../theme/ThemeContext";

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
  style?: StyleProp<ViewStyle>;
  gradientColors?: string[];
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  testID?: string;
  onLongPress?: () => void;
  delayLongPress?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  variant = "default",
  elevation = "md",
  padding,
  style,
  gradientColors,
  icon,
  footer,
  testID,
  onLongPress,
  delayLongPress,
  accessibilityLabel,
  accessibilityHint,
  contentStyle,
  intensity = 20,
}) => {
  const themeContext = useThemeContextSafe();
  const theme = themeContext?.theme;

  const actualPadding = padding !== undefined ? padding : (theme ? theme.spacing.md : modernSpacing.cardPadding);

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

  // Memoized dynamic styles
  const dynamicStyles = React.useMemo(() => {
    const elevationShadows = {
      none: {},
      sm: theme ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      } : modernShadows.sm,
      md: theme ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      } : modernShadows.md,
      lg: theme ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
      } : modernShadows.lg,
    };

    return StyleSheet.create({
      card: {
        borderRadius: theme ? theme.radius.lg : modernBorderRadius.card,
        overflow: "hidden",
      },
      content: {
        padding: actualPadding,
        flex: 1,
      },
      default: {
        backgroundColor: theme ? theme.colors.surface : modernColors.background.paper,
        borderWidth: 1,
        borderColor: theme ? theme.colors.border : modernColors.border.light,
        ...elevationShadows[elevation],
      },
      elevated: {
        backgroundColor: theme ? theme.colors.surface : modernColors.background.paper,
        ...elevationShadows[elevation],
      },
      glass: {
        backgroundColor: theme ? theme.colors.glass : "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        borderColor: theme ? theme.colors.borderLight : "rgba(255, 255, 255, 0.15)",
      },
      gradient: {
        backgroundColor: "transparent",
      },
      outlined: {
        backgroundColor: theme ? theme.colors.surface : modernColors.background.paper,
        borderWidth: 2,
        borderColor: theme ? theme.colors.border : modernColors.border.medium,
      },
      title: {
        ...modernTypography.h5,
        color: theme ? theme.colors.text : modernColors.text.primary,
        marginBottom: theme ? theme.spacing.xs : modernSpacing.xs,
      },
      subtitle: {
        ...modernTypography.body.small,
        color: theme ? theme.colors.textSecondary : modernColors.text.secondary,
      },
      footer: {
        marginTop: theme ? theme.spacing.md : modernSpacing.md,
        paddingTop: theme ? theme.spacing.md : modernSpacing.md,
        borderTopWidth: 1,
        borderTopColor: theme ? theme.colors.border : modernColors.border.light,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: theme ? theme.spacing.md : modernSpacing.md,
      },
      iconContainer: {
        marginRight: theme ? theme.spacing.sm : modernSpacing.sm,
      },
    });
  }, [theme, elevation, actualPadding]);

  // Render card content
  const renderContent = () => {
    return (
      <View style={[dynamicStyles.content, contentStyle]}>
        {(title || subtitle || icon) && (
          <View style={dynamicStyles.header}>
            {icon && (
              <View style={dynamicStyles.iconContainer}>
                <Ionicons
                  name={icon}
                  size={24}
                  color={theme ? theme.colors.accent : modernColors.primary[500]}
                />
              </View>
            )}
            <View style={styles.headerText}>
              {title && <Text style={dynamicStyles.title}>{title}</Text>}
              {subtitle && <Text style={dynamicStyles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
        )}

        <View style={styles.body}>{children}</View>

        {footer && <View style={dynamicStyles.footer}>{footer}</View>}
      </View>
    );
  };

  // Render card based on variant
  const renderCard = () => {
    const cardStyle = [dynamicStyles.card, (dynamicStyles as any)[variant], style];
    const Component = onPress ? AnimatedTouchableOpacity : AnimatedView;

    if (variant === "gradient") {
      const colors = gradientColors || (theme ? theme.gradients.surface : modernColors.gradients.surface);
      return (
        <Component
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={delayLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, cardStyle]}
          testID={testID}
          accessible={true}
          accessibilityRole={onPress ? "button" : "none"}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint}
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
          accessible={true}
          accessibilityRole={onPress ? "button" : "none"}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint}
        >
          <BlurView intensity={intensity} tint="dark" style={styles.blur}>
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
        accessible={true}
        accessibilityRole={onPress ? "button" : "none"}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
      >
        {renderContent()}
      </Component>
    );
  };

  return renderCard();
};

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  blur: {
    flex: 1,
  },
});

export default ModernCard;
