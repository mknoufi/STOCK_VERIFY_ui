/**
 * SupervisorLayout Component - Layout wrapper for supervisor routes
 * Includes SupervisorSidebar (web/tablet) or Drawer (mobile), AppHeader, and Screen
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './Screen';
import { AppHeader } from '../navigation/AppHeader';
import { SupervisorSidebar } from '../navigation/SupervisorSidebar';
import { useTheme } from '../../hooks/useTheme';
import { layout, spacing, breakpoints } from '../../styles/globalStyles';

interface SupervisorLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: Array<{
    icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  }>;
  style?: ViewStyle;
  testID?: string;
}

export const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({
  children,
  title,
  headerActions = [],
  style,
  testID,
}) => {
  const theme = useTheme();
  const rawSegments = useSegments();
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  const { width } = Dimensions.get('window');
  const isMobile = width < breakpoints.tablet;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-detect title from route if not provided
  const screenTitle =
    title ||
    (segments[1] === 'dashboard'
      ? 'Dashboard'
      : segments[1] === 'session-detail'
      ? 'Session Detail'
      : segments[1] === 'settings'
      ? 'Settings'
      : 'Supervisor');

  // On mobile, sidebar becomes a drawer
  if (isMobile) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <AppHeader
          title={screenTitle}
          showBack={false}
          actions={[
            {
              icon: 'menu',
              label: 'Open menu',
              onPress: () => setDrawerOpen(true),
            },
            ...headerActions,
          ]}
        />
        <Screen variant="scrollable" style={styles.screen}>
          {children}
        </Screen>
        {/* Drawer overlay */}
        {drawerOpen && (
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={() => setDrawerOpen(false)}
            />
            <View style={styles.drawer}>
              <SupervisorSidebar collapsed={false} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Web/Tablet: Persistent sidebar
  return (
    <View style={[styles.container, style]} testID={testID}>
      <SupervisorSidebar collapsed={sidebarCollapsed} />
      <View
        style={[
          styles.content,
          {
            marginLeft: sidebarCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
          },
        ]}
      >
        <AppHeader
          title={screenTitle}
          showBack={false}
          actions={[
            {
              icon: sidebarCollapsed ? 'chevron-forward' : 'chevron-back',
              label: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
              onPress: () => setSidebarCollapsed(!sidebarCollapsed),
            },
            ...headerActions,
          ]}
        />
        <Screen variant="scrollable" style={styles.screen}>
          {children}
        </Screen>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: layout.sidebarWidth,
    zIndex: 1001,
  },
});
