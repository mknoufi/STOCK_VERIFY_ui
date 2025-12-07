/**
 * GlassCard - Premium glassmorphism card component
 * Features: Blur background, gradient borders, animated effects
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
} from '../../styles/modernDesignSystem';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  intensity?: number;
  style?: ViewStyle;
  animateOnMount?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  variant = 'default',
  intensity = 20,
  style,
  animateOnMount = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animateOnMount ? 20 : 0)).current;

  useEffect(() => {
    if (animateOnMount) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    }
  }, [animateOnMount, fadeAnim, translateY]);

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  };

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...modernShadows.lg,
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: modernColors.border.light,
        };
      case 'gradient':
        return {};
      default:
        return {
          ...modernShadows.md,
        };
    }
  };

  const CardContent = () => (
    <>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </>
  );

  const CardWrapper = ({ children: wrapperChildren }: { children: React.ReactNode }) => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={[styles.blurContainer, getVariantStyle()]}
        >
          {wrapperChildren}
        </BlurView>
      );
    }

    return (
      <View style={[styles.androidContainer, getVariantStyle()]}>
        {wrapperChildren}
      </View>
    );
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }, { translateY }],
  };

  if (variant === 'gradient') {
    return (
      <Animated.View style={[styles.container, animatedStyle, style]}>
        <LinearGradient
          colors={[modernColors.background.elevated, modernColors.background.paper]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientContainer, modernShadows.lg]}
        >
          <View style={styles.gradientBorder}>
            {onPress ? (
              <TouchableOpacity
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.touchable}
              >
                <CardContent />
              </TouchableOpacity>
            ) : (
              <CardContent />
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {onPress ? (
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <CardWrapper>
            <CardContent />
          </CardWrapper>
        </TouchableOpacity>
      ) : (
        <CardWrapper>
          <CardContent />
        </CardWrapper>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  blurContainer: {
    borderRadius: modernBorderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  androidContainer: {
    backgroundColor: modernColors.background.glass,
    borderRadius: modernBorderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientContainer: {
    borderRadius: modernBorderRadius.card,
    padding: 1,
  },
  gradientBorder: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.card - 1,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  header: {
    padding: modernSpacing.cardPadding,
    paddingBottom: modernSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  title: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  },
  subtitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginTop: 4,
  },
  content: {
    padding: modernSpacing.cardPadding,
  },
});

export default GlassCard;
