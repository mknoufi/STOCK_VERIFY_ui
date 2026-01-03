/**
 * AnimatedCard Component
 * Feature-rich card with entry animations, press feedback, and theme tokens
 *
 * Combines patterns from Aashu-Dubey repo with unified design system
 */

import React, { useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  radius,
  shadows,
  semanticColors,
  gradients,
  animationPresets,
} from '../../theme/unified';
import { useEntryAnimation, useScalePress } from '../../hooks/useAnimations';

// ==========================================
// TYPES
// ==========================================
export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'glass' | 'gradient';

export interface AnimatedCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card variant style */
  variant?: CardVariant;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Whether card is pressable */
  onPress?: () => void;
  /** Whether to animate entry */
  animated?: boolean;
  /** Index for staggered animation (for lists) */
  staggerIndex?: number;
  /** Enable press scale feedback */
  pressable?: boolean;
  /** Gradient colors (for gradient variant) */
  gradientColors?: readonly [string, string, ...string[]];
  /** Blur intensity (for glass variant) */
  blurIntensity?: number;
  /** Disable the card */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ==========================================
// COMPONENT
// ==========================================
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  variant = 'elevated',
  style,
  onPress,
  animated = true,
  staggerIndex,
  pressable = !!onPress,
  gradientColors = gradients.primary as unknown as readonly [string, string, ...string[]],
  blurIntensity = 50,
  disabled = false,
  testID,
}) => {
  // Entry animation
  const isStaggered = staggerIndex !== undefined;
  const delay = isStaggered
    ? (staggerIndex * animationPresets.staggeredEntry.staggerDelay)
    : 0;

  const duration = isStaggered
    ? animationPresets.staggeredEntry.duration
    : animationPresets.slideUp.duration;

  const translateY = isStaggered
    ? 50 // Default from useStaggeredEntry
    : animationPresets.slideUp.translateY;

  const entryAnimation = useEntryAnimation({
    delay,
    duration,
    translateY,
  });

  // Press scale animation
  const { onPressIn, onPressOut, animatedStyle: scaleStyle } = useScalePress();

  // Combine animation styles
  const animatedStyles = animated
    ? [entryAnimation.animatedStyle, pressable && scaleStyle]
    : [pressable && scaleStyle];

  // Get variant-specific styles
  const variantStyles = getVariantStyles(variant);

  // Render card content based on variant
  const renderCardContent = () => {
    switch (variant) {
      case 'glass':
        return (
          <BlurView
            intensity={blurIntensity}
            tint="light"
            style={[styles.cardBase, variantStyles, style]}
          >
            {children}
          </BlurView>
        );

      case 'gradient':
        return (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardBase, variantStyles, style]}
          >
            {children}
          </LinearGradient>
        );

      default:
        return (
          <Animated.View style={[styles.cardBase, variantStyles, style]}>
            {children}
          </Animated.View>
        );
    }
  };

  // Handle press events
  const handlePressIn = useCallback(() => {
    if (pressable && !disabled) {
      onPressIn();
    }
  }, [pressable, disabled, onPressIn]);

  const handlePressOut = useCallback(() => {
    if (pressable && !disabled) {
      onPressOut();
    }
  }, [pressable, disabled, onPressOut]);

  // Wrap with pressable if needed
  if (pressable && onPress) {
    return (
      <Animated.View style={animatedStyles}>
        <Pressable
          onPress={disabled ? undefined : onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          testID={testID}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(0, 0, 0, 0.1)', borderless: false }
              : undefined
          }
        >
          {renderCardContent()}
        </Pressable>
      </Animated.View>
    );
  }

  // Non-pressable card
  return (
    <Animated.View style={animatedStyles} testID={testID}>
      {variant === 'glass' || variant === 'gradient'
        ? renderCardContent()
        : (
          <Animated.View style={[styles.cardBase, variantStyles, style]}>
            {children}
          </Animated.View>
        )
      }
    </Animated.View>
  );
};

// ==========================================
// VARIANT STYLES
// ==========================================
function getVariantStyles(variant: CardVariant): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: semanticColors.background.elevated,
        ...shadows.md,
      };

    case 'outlined':
      return {
        backgroundColor: semanticColors.background.primary,
        borderWidth: 1,
        borderColor: semanticColors.border.default,
      };

    case 'filled':
      return {
        backgroundColor: semanticColors.background.secondary,
      };

    case 'glass':
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      };

    case 'gradient':
      return {
        // Gradient handles its own background
      };

    default:
      return {
        backgroundColor: semanticColors.background.elevated,
        ...shadows.sm,
      };
  }
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  cardBase: {
    borderRadius: radius.md,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});

// ==========================================
// PRESET CARDS
// ==========================================

/**
 * StatsCard - For dashboard statistics
 */
export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  onPress?: () => void;
  staggerIndex?: number;
}

export const StatsCardPreset: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  onPress,
  staggerIndex,
}) => {
  return (
    <AnimatedCard
      variant="elevated"
      onPress={onPress}
      staggerIndex={staggerIndex}
      style={statsStyles.card}
    >
      <Animated.View style={statsStyles.header}>
        {icon && <Animated.View style={statsStyles.icon}>{icon}</Animated.View>}
        <Animated.Text style={statsStyles.title}>{title}</Animated.Text>
      </Animated.View>
      <Animated.Text style={statsStyles.value}>{value}</Animated.Text>
      {subtitle && (
        <Animated.Text style={statsStyles.subtitle}>{subtitle}</Animated.Text>
      )}
    </AnimatedCard>
  );
};

const statsStyles = StyleSheet.create({
  card: {
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
  },
});

// Default export
export default AnimatedCard;
