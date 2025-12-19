/**
 * StaffLayout Component - Layout wrapper for staff routes
 * Includes AppHeader, Screen, and StaffTabBar (mobile)
 */

import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useSegments } from 'expo-router';
import { Screen } from './Screen';
import { AppHeader } from '../navigation/AppHeader';
import { StaffTabBar } from '../navigation/StaffTabBar';
import { layout } from '../../styles/globalStyles';

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
  showFAB?: boolean;
  fabAction?: () => void;
  headerActions?: Array<{
    icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  }>;
  style?: ViewStyle;
  testID?: string;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  children,
  title,
  showFAB = false,
  fabAction,
  headerActions = [],
  style,
  testID,
}) => {
  const rawSegments = useSegments();
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  const isMobile = Platform.OS !== 'web';

  // Auto-detect title from route if not provided
  const screenTitle =
    title ||
    (segments[1] === 'home'
      ? 'Sessions'
      : segments[1] === 'scan'
      ? 'Scan'
      : segments[1] === 'history'
      ? 'History'
      : 'Staff');

  // Show back button if not on home screen
  const showBack = segments[1] !== 'home' && segments[1] !== undefined;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <AppHeader
        title={screenTitle}
        showBack={showBack}
        actions={headerActions}
      />
      <Screen variant="scrollable" style={styles.screen}>
        {children}
      </Screen>
      {isMobile && <StaffTabBar />}
      {showFAB && fabAction && (
        <View style={styles.fabContainer}>
          {/* FAB will be implemented separately */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingBottom: Platform.OS !== 'web' ? layout.tabBarHeight : 0,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS !== 'web' ? layout.tabBarHeight + 16 : 16,
    right: 16,
    zIndex: 100,
  },
});
