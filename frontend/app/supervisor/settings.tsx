/**
 * Settings Screen - App settings and preferences
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../hooks/useTheme';
import { SettingItem } from '../../components/SettingItem';
import { SettingGroup } from '../../components/SettingGroup';
import { Header } from '../../components/Header';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSetting, resetSettings } = useSettingsStore();
  const theme = useTheme();

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            Alert.alert('Success', 'Settings reset to default');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Settings"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Theme Settings */}
        <SettingGroup title="Theme" icon="color-palette">
          <SettingItem
            label="Dark Mode"
            value={settings.darkMode}
            type="switch"
            onValueChange={(value) => setSetting('darkMode', value)}
          />
          <SettingItem
            label="Theme"
            value={settings.theme}
            type="select"
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'Auto', value: 'auto' },
            ]}
            onValueChange={(value) => setSetting('theme', value)}
          />
        </SettingGroup>

        {/* Notifications */}
        <SettingGroup title="Notifications" icon="notifications">
          <SettingItem
            label="Enable Notifications"
            value={settings.notificationsEnabled}
            type="switch"
            onValueChange={(value) => setSetting('notificationsEnabled', value)}
          />
          <SettingItem
            label="Notification Sound"
            value={settings.notificationSound}
            type="switch"
            disabled={!settings.notificationsEnabled}
            onValueChange={(value) => setSetting('notificationSound', value)}
          />
          <SettingItem
            label="Badge Count"
            value={settings.notificationBadge}
            type="switch"
            disabled={!settings.notificationsEnabled}
            onValueChange={(value) => setSetting('notificationBadge', value)}
          />
        </SettingGroup>

        {/* Sync Settings */}
        <SettingGroup title="Sync" icon="sync">
          <SettingItem
            label="Auto Sync"
            value={settings.autoSyncEnabled}
            type="switch"
            onValueChange={(value) => setSetting('autoSyncEnabled', value)}
          />
          <SettingItem
            label="Sync Interval"
            value={`${settings.autoSyncInterval} minutes`}
            type="slider"
            min={1}
            max={60}
            step={1}
            disabled={!settings.autoSyncEnabled}
            onValueChange={(value) => setSetting('autoSyncInterval', value)}
          />
          <SettingItem
            label="Sync on Reconnect"
            value={settings.syncOnReconnect}
            type="switch"
            disabled={!settings.autoSyncEnabled}
            onValueChange={(value) => setSetting('syncOnReconnect', value)}
          />
        </SettingGroup>

        {/* Offline Settings */}
        <SettingGroup title="Offline" icon="cloud-offline">
          <SettingItem
            label="Offline Mode"
            value={settings.offlineMode}
            type="switch"
            onValueChange={(value) => setSetting('offlineMode', value)}
          />
          <SettingItem
            label="Cache Expiration"
            value={`${settings.cacheExpiration} hours`}
            type="slider"
            min={1}
            max={168}
            step={1}
            disabled={!settings.offlineMode}
            onValueChange={(value) => setSetting('cacheExpiration', value)}
          />
          <SettingItem
            label="Max Queue Size"
            value={settings.maxQueueSize.toString()}
            type="number"
            disabled={!settings.offlineMode}
            onValueChange={(value) => setSetting('maxQueueSize', parseInt(value))}
          />
        </SettingGroup>

        {/* Scanner Settings */}
        <SettingGroup title="Scanner" icon="barcode">
          <SettingItem
            label="Vibration"
            value={settings.scannerVibration}
            type="switch"
            onValueChange={(value) => setSetting('scannerVibration', value)}
          />
          <SettingItem
            label="Sound"
            value={settings.scannerSound}
            type="switch"
            onValueChange={(value) => setSetting('scannerSound', value)}
          />
          <SettingItem
            label="Auto Submit"
            value={settings.scannerAutoSubmit}
            type="switch"
            onValueChange={(value) => setSetting('scannerAutoSubmit', value)}
          />
          <SettingItem
            label="Timeout"
            value={`${settings.scannerTimeout} seconds`}
            type="slider"
            min={5}
            max={60}
            step={5}
            onValueChange={(value) => setSetting('scannerTimeout', value)}
          />
        </SettingGroup>

        {/* Display Settings */}
        <SettingGroup title="Display" icon="eye">
          <SettingItem
            label="Font Size"
            value={settings.fontSize}
            type="select"
            options={[
              { label: 'Small', value: 'small' },
              { label: 'Medium', value: 'medium' },
              { label: 'Large', value: 'large' },
            ]}
            onValueChange={(value) => setSetting('fontSize', value)}
          />
          <SettingItem
            label="Show Item Images"
            value={settings.showItemImages}
            type="switch"
            onValueChange={(value) => setSetting('showItemImages', value)}
          />
          <SettingItem
            label="Show Prices"
            value={settings.showItemPrices}
            type="switch"
            onValueChange={(value) => setSetting('showItemPrices', value)}
          />
          <SettingItem
            label="Show Stock"
            value={settings.showItemStock}
            type="switch"
            onValueChange={(value) => setSetting('showItemStock', value)}
          />
        </SettingGroup>

        {/* Data Settings */}
        <SettingGroup title="Data" icon="server">
          <SettingItem
            label="Export Format"
            value={settings.exportFormat.toUpperCase()}
            type="select"
            options={[
              { label: 'CSV', value: 'csv' },
              { label: 'JSON', value: 'json' },
            ]}
            onValueChange={(value) => setSetting('exportFormat', value)}
          />
          <SettingItem
            label="Backup Frequency"
            value={settings.backupFrequency}
            type="select"
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Never', value: 'never' },
            ]}
            onValueChange={(value) => setSetting('backupFrequency', value)}
          />
        </SettingGroup>

        {/* Database Mapping */}
        <SettingGroup title="Database Mapping" icon="swap-horizontal">
          <TouchableOpacity
            style={styles.mappingButton}
            onPress={() => router.push('/supervisor/db-mapping')}
          >
            <Ionicons name="settings" size={20} color={theme.colors.primary} />
            <Text style={[styles.mappingButtonText, { color: theme.colors.primary }]}>
              Configure Table & Column Mapping
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </SettingGroup>

        {/* Help & Support */}
        <SettingGroup title="Help & Support" icon="help-circle">
          <TouchableOpacity
            style={styles.mappingButton}
            onPress={() => router.push('/help')}
          >
            <Ionicons name="help-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.mappingButtonText, { color: theme.colors.primary }]}>
              Help & Documentation
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </SettingGroup>

        {/* Security Settings */}
        <SettingGroup title="Security" icon="lock-closed">
          <SettingItem
            label="Require Authentication"
            value={settings.requireAuth}
            type="switch"
            onValueChange={(value) => setSetting('requireAuth', value)}
          />
          <SettingItem
            label="Session Timeout"
            value={`${settings.sessionTimeout} minutes`}
            type="slider"
            min={5}
            max={480}
            step={5}
            onValueChange={(value) => setSetting('sessionTimeout', value)}
          />
          <SettingItem
            label="Biometric Auth"
            value={settings.biometricAuth}
            type="switch"
            disabled={!settings.requireAuth}
            onValueChange={(value) => setSetting('biometricAuth', value)}
          />
        </SettingGroup>

        {/* Performance Settings */}
        <SettingGroup title="Performance" icon="speedometer">
          <SettingItem
            label="Image Cache"
            value={settings.imageCache}
            type="switch"
            onValueChange={(value) => setSetting('imageCache', value)}
          />
          <SettingItem
            label="Lazy Loading"
            value={settings.lazyLoading}
            type="switch"
            onValueChange={(value) => setSetting('lazyLoading', value)}
          />
          <SettingItem
            label="Debounce Delay"
            value={`${settings.debounceDelay}ms`}
            type="slider"
            min={100}
            max={1000}
            step={100}
            onValueChange={(value) => setSetting('debounceDelay', value)}
          />
        </SettingGroup>

        {/* Reset Button */}
        <View style={styles.resetContainer}>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: theme.colors.error }]}
            onPress={handleReset}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.error} />
            <Text style={[styles.resetText, { color: theme.colors.error }]}>
              Reset to Default
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  resetContainer: {
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mappingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  mappingButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
