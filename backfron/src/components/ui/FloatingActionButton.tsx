/**
 * FloatingActionButton - Premium FAB with animations and variants
 * Features: Scale animation, haptic feedback, badge support
 */

import React, { useRef } from 'react';
import {
  StyleSheet,
  Animated,
  TouchableOpacity,
  View,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  modernColors,
  modernShadows,
  modernSpacing,
} from '../../styles/modernDesignSystem';

type FABVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger';
type FABSize = 'small' | 'medium' | 'large';

interface FloatingActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: FABVariant;
  size?: FABSize;
  label?: string;
  badge?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  label,
  badge,
  disabled = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        friction: 5,
        tension: 200,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0.1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 200,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getVariantColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: modernColors.secondary[500],
          icon: '#FFFFFF',
        };
      case 'accent':
        return {
          background: modernColors.accent[500],
          icon: '#FFFFFF',
        };
      case 'success':
        return {
          background: modernColors.success.main,
          icon: '#FFFFFF',
        };
      case 'danger':
        return {
          background: modernColors.error.main,
          icon: '#FFFFFF',
        };
      default:
        return {
          background: modernColors.primary[500],
          icon: '#FFFFFF',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          buttonSize: 48,
          iconSize: 20,
          labelSize: 12,
        };
      case 'large':
        return {
          buttonSize: 72,
          iconSize: 32,
          labelSize: 16,
        };
      default:
        return {
          buttonSize: 56,
          iconSize: 24,
          labelSize: 14,
        };
    }
  };

  const colors = getVariantColors();
  const sizes = getSizeStyles();

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }, { rotate }],
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[
          styles.button,
          {
            width: label ? 'auto' : sizes.buttonSize,
            height: sizes.buttonSize,
            backgroundColor: colors.background,
            borderRadius: label ? sizes.buttonSize / 2 : sizes.buttonSize / 2,
            paddingHorizontal: label ? modernSpacing.lg : 0,
          },
          modernShadows.lg,
        ]}
      >
        <Ionicons name={icon} size={sizes.iconSize} color={colors.icon} />

        {label && (
          <Text
            style={[
              styles.label,
              { fontSize: sizes.labelSize, color: colors.icon },
            ]}
          >
            {label}
          </Text>
        )}

        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: modernColors.error.main,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: modernColors.background.paper,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default FloatingActionButton;
