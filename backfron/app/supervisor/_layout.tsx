/**
 * Supervisor Layout - Stack navigation for supervisor screens
 */

import React from 'react';
import { Stack } from 'expo-router';
import { modernColors } from '../../src/styles/modernDesignSystem';

export default function SupervisorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: modernColors.background.default },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="session-detail" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="db-mapping" />
      <Stack.Screen name="activity-logs" />
      <Stack.Screen name="error-logs" />
      <Stack.Screen name="export-schedules" />
      <Stack.Screen name="export-results" />
      <Stack.Screen name="sync-conflicts" />
      <Stack.Screen name="offline-queue" />
      <Stack.Screen name="export" />
      <Stack.Screen name="items" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="variance-details" />
      <Stack.Screen name="variances" />
    </Stack>
  );
}
