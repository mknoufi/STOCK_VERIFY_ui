/**
 * PremiumHeader Component - Premium app header with glassmorphism
 * Features:
 * - Animated logo
 * - User info display
 * - Glassmorphism effect
 * - Logout/menu button
 * - Status indicators
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
} from '../../styles/modernDesignSystem';

interface PremiumHeaderProps {
  title?: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  showLogo?: boolean;
  showUserInfo?: boolean;
  onLogout?: () => void;
  onMenuPress?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
  };
  style?: ViewStyle;
}

export const PremiumHeader: React.FC<PremiumHeaderProps> = ({
  title = 'Stock Verify',
  subtitle,
  userName,
  userRole,
  showLogo = true,
  showUserInfo = true,
  onLogout,
  onMenuPress,
  rightAction,
  style,
}) => {
  // Logo pulse animation
  const logoScale = useSharedValue(1);

  React.useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 }),
      ),
      -1,
      true,
    );
  }, [logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const renderUserInfo = () => (
    <View style={styles.userInfo}>
      <Text style={styles.greeting}>Welcome back,</Text>
      <Text style={styles.userName}>{userName || 'User'}</Text>
      {userRole && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{userRole}</Text>
        </View>
      )}
    </View>
  );

  const renderLogo = () => (
    <Animated.View style={[styles.logoContainer, logoStyle]} entering={FadeIn.delay(100)}>
      <View style={styles.iconGlow}>
        <Ionicons name="cube" size={32} color={modernColors.primary[400]} />
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );

  const renderRightAction = () => {
    if (rightAction) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}
          onPress={rightAction.onPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={rightAction.icon}
            size={22}
            color={rightAction.color || modernColors.primary[400]}
          />
        </TouchableOpacity>
      );
    }

    if (onLogout) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={modernColors.error.main} />
        </TouchableOpacity>
      );
    }

    if (onMenuPress) {
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={24} color={modernColors.text.primary} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
        <View style={styles.container}>
          {/* Left side - Logo or User Info */}
          <View style={styles.leftContent}>
            {showLogo && renderLogo()}
            {showUserInfo && userName && !showLogo && renderUserInfo()}
          </View>

          {/* Right side - Actions */}
          <View style={styles.rightContent}>
            {showUserInfo && showLogo && userName && (
              <View style={styles.compactUserInfo}>
                <Ionicons name="person-circle" size={28} color={modernColors.primary[400]} />
                <View style={styles.compactUserText}>
                  <Text style={styles.compactUserName}>{userName}</Text>
                  {userRole && <Text style={styles.compactRole}>{userRole}</Text>}
                </View>
              </View>
            )}
            {renderRightAction()}
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  blurContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: modernSpacing.md,
    paddingHorizontal: modernSpacing.lg,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.md,
  },
  iconGlow: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    ...modernShadows.sm,
  },
  titleContainer: {
    gap: 2,
  },
  title: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
  userInfo: {
    gap: 2,
  },
  greeting: {
    ...modernTypography.label.medium,
    color: modernColors.text.tertiary,
  },
  userName: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    fontWeight: '600',
  },
  roleBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 2,
    borderRadius: modernBorderRadius.full,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleText: {
    ...modernTypography.label.small,
    color: modernColors.primary[400],
    textTransform: 'capitalize',
  },
  compactUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.sm,
    paddingRight: modernSpacing.sm,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: modernSpacing.xs,
  },
  compactUserText: {
    gap: 0,
  },
  compactUserName: {
    ...modernTypography.label.medium,
    color: modernColors.text.primary,
    fontWeight: '600',
  },
  compactRole: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    fontSize: 10,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: modernBorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
});

export default PremiumHeader;
