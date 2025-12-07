/**
 * Admin Layout - Stack navigation for admin screens
 */

import React from 'react';
import { Stack } from 'expo-router';
import { modernColors } from '../../src/styles/modernDesignSystem';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: modernColors.background.default },
      }}
    >
      <Stack.Screen name="control-panel" />
      <Stack.Screen name="metrics" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="sql-config" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="security" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
