/**
 * AnimatedHeader - Premium animated header with scroll-based effects
 * Features: Blur on scroll, fade animations, sticky behavior
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from '../../styles/modernDesignSystem';

interface AnimatedHeaderProps {
  title: string;
  subtitle?: string;
  scrollY?: Animated.Value;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: number;
  };
  variant?: 'default' | 'large' | 'transparent';
  style?: ViewStyle;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  title,
  subtitle,
  scrollY = new Animated.Value(0),
  showBackButton = false,
  onBackPress,
  rightAction,
  variant = 'default',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const headerHeight = variant === 'large' ? 140 : 100;
  const collapsedHeight = 60 + insets.top;

  // Scroll-based animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackPress?.();
  };

  const handleRightAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rightAction?.onPress();
  };

  const BlurBackground = Platform.OS === 'ios' ? BlurView : View;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top },
        style,
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* Background blur effect on scroll */}
      {Platform.OS === 'ios' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: headerOpacity },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      {/* Fallback background for Android */}
      {Platform.OS === 'android' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.androidBackground,
            { opacity: headerOpacity },
          ]}
        />
      )}

      <View style={styles.content}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={modernColors.text.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: titleScale },
                { translateY: titleTranslateY },
              ],
            },
          ]}
        >
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Animated.Text
              style={[styles.subtitle, { opacity: subtitleOpacity }]}
              numberOfLines={1}
            >
              {subtitle}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightAction && (
            <TouchableOpacity
              onPress={handleRightAction}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={rightAction.icon}
                size={24}
                color={modernColors.text.primary}
              />
              {rightAction.badge && rightAction.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {rightAction.badge > 99 ? '99+' : rightAction.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  androidBackground: {
    backgroundColor: modernColors.background.paper,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    minHeight: 56,
  },
  leftSection: {
    width: 48,
    alignItems: 'flex-start',
  },
  rightSection: {
    width: 48,
    alignItems: 'flex-end',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
    marginTop: 2,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 20,
  },
  actionButton: {
    padding: 8,
    marginRight: -8,
    borderRadius: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: modernColors.error.main,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AnimatedHeader;
