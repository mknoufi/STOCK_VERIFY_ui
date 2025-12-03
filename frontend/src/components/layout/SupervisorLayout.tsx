/**
 * SupervisorLayout Component - Layout wrapper for supervisor routes
 * Includes AppHeader with user info and Screen wrapper
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenVariant } from './Screen';
import { AppHeader } from '../navigation/AppHeader';
import { useAuthStore } from '../../store/authStore';

interface SupervisorLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  headerActions?: {
    icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  }[];
  style?: ViewStyle;
  testID?: string;
  screenVariant?: ScreenVariant;
  backgroundColor?: string;
}

export const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({
  children,
  title,
  showBack,
  headerActions = [],
  style,
  testID,
  screenVariant = 'scrollable',
  backgroundColor,
}) => {
  const router = useRouter();
  const { logout } = useAuthStore();

  // Auto-detect title from route if not provided
  const screenTitle = title || 'Supervisor Dashboard';

  // Default actions for supervisor (e.g., Logout)
  const defaultActions = [
    {
      icon: 'log-out-outline' as const,
      label: 'Logout',
      onPress: () => {
        Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/login');
            },
          },
        ]);
      },
    },
  ];

  const actions = [...headerActions, ...defaultActions];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <AppHeader title={screenTitle} showBack={showBack} showUser={true} actions={actions} />
      <Screen variant={screenVariant} style={styles.screen} backgroundColor={backgroundColor}>
        {children}
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});
