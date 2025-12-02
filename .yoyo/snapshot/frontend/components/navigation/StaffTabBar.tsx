/**
 * StaffTabBar Component - Bottom tab bar for staff role
 * Mobile-only navigation (hidden on web)
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
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { layout, spacing, typography } from '../../styles/globalStyles';

interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

const STAFF_TABS: TabItem[] = [
  {
    key: 'sessions',
    label: 'Sessions',
    icon: 'home',
    route: '/staff/home',
  },
  {
    key: 'scan',
    label: 'Scan',
    icon: 'scan',
    route: '/staff/scan',
  },
  {
    key: 'history',
    label: 'History',
    icon: 'time',
    route: '/staff/history',
  },
];

interface StaffTabBarProps {
  style?: ViewStyle;
  testID?: string;
}

export const StaffTabBar: React.FC<StaffTabBarProps> = ({ style, testID }) => {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();

  // Hide on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Determine active tab based on current route
  const currentRoute = segments.join('/');
  const activeTab = STAFF_TABS.find((tab) => {
    const tabRoute = tab.route.replace(/^\//, ''); // Remove leading slash
    return currentRoute === tabRoute || currentRoute.startsWith(tabRoute + '/');
  })?.key || 'sessions';

  const handleTabPress = (tab: TabItem) => {
    if (activeTab !== tab.key) {
      router.push(tab.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {STAFF_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? theme.colors.primary : theme.colors.textSecondary;
        const labelColor = isActive ? theme.colors.primary : theme.colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={tab.icon} size={24} color={iconColor} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: labelColor }]}>{tab.label}</Text>
              {isActive && (
                <View style={[styles.indicator, { backgroundColor: theme.colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: layout.tabBarHeight,
    flexDirection: 'row',
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        paddingBottom: spacing.sm, // Account for safe area
      },
    }),
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF', // Ensure badge is visible
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  label: {
    ...typography.caption,
    fontSize: 11,
  },
  indicator: {
    position: 'absolute',
    bottom: -spacing.xs - 2,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});

