/**
 * Settings Screen - App settings and preferences
 * Refactored to use Aurora Design System
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useSettingsStore } from "../../src/store/settingsStore";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";
import {
  ChangePinModal,
  ChangePasswordModal,
} from "../../src/components/settings";

// Reusable Setting Row Component
const SettingRow = ({
  label,
  value,
  type,
  onValueChange,
  options = [],
  disabled = false,
  icon,
}: {
  label: string;
  value: any;
  type: "switch" | "select" | "slider" | "number";
  onValueChange: (value: any) => void;
  options?: { label: string; value: any }[];
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();

    if (type === "select" && options.length > 0) {
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      const nextOption = options[nextIndex];
      if (nextOption) {
        onValueChange(nextOption.value);
      }
    }
  };

  return (
    <AnimatedPressable
      style={[styles.settingRow, disabled && styles.disabledRow]}
      onPress={handlePress}
      disabled={disabled || type === "switch"}
    >
      <View style={styles.settingLeft}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={18}
              color={theme.colors.text.primary}
            />
          </View>
        )}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>

      <View style={styles.settingRight}>
        {type === "switch" && (
          <Switch
            value={value}
            onValueChange={(val) => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onValueChange(val);
            }}
            disabled={disabled}
            trackColor={{
              false: "rgba(255,255,255,0.1)",
              true: theme.colors.primary[500],
            }}
            thumbColor={theme.colors.text.primary}
            ios_backgroundColor="rgba(255,255,255,0.05)"
          />
        )}

        {type === "select" && (
          <View style={styles.selectContainer}>
            <Text style={styles.selectValue}>
              {options.find((opt) => opt.value === value)?.label ||
                String(value)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.text.tertiary}
            />
          </View>
        )}

        {(type === "slider" || type === "number") && (
          <Text style={styles.valueText}>{String(value)}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSetting, resetSettings } = useSettingsStore();
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleReset = () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetSettings();
            Alert.alert("Success", "Settings reset to default");
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Settings</Text>
              <Text style={styles.pageSubtitle}>
                Preferences & Configuration
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Theme Settings */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <GlassCard intensity={15} padding={0} style={styles.card}>
            <AnimatedPressable
              style={styles.settingRow}
              onPress={() => router.push("/supervisor/appearance")}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="color-palette-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                </View>
                <Text style={styles.settingLabel}>Customize Appearance</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </AnimatedPressable>
            <View style={styles.divider} />
            <SettingRow
              label="Dark Mode"
              value={settings.darkMode}
              type="switch"
              icon="moon-outline"
              onValueChange={(value) => setSetting("darkMode", value)}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Theme"
              value={settings.theme}
              type="select"
              icon="contrast-outline"
              options={[
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
                { label: "Auto", value: "auto" },
              ]}
              onValueChange={(value) => setSetting("theme", value)}
            />
          </GlassCard>
        </Animated.View>

        {/* Sync Settings */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Data & Sync</Text>
          <GlassCard intensity={15} padding={0} style={styles.card}>
            <SettingRow
              label="Auto Sync"
              value={settings.autoSyncEnabled}
              type="switch"
              icon="sync-outline"
              onValueChange={(value) => setSetting("autoSyncEnabled", value)}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Sync Interval (mins)"
              value={settings.autoSyncInterval}
              type="slider"
              icon="time-outline"
              disabled={!settings.autoSyncEnabled}
              onValueChange={(value) => setSetting("autoSyncInterval", value)}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Offline Mode"
              value={settings.offlineMode}
              type="switch"
              icon="cloud-offline-outline"
              onValueChange={(value) => setSetting("offlineMode", value)}
            />
          </GlassCard>
        </Animated.View>

        {/* Scanner Settings */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Scanner</Text>
          <GlassCard intensity={15} padding={0} style={styles.card}>
            <SettingRow
              label="Vibration Feedback"
              value={settings.scannerVibration}
              type="switch"
              icon="pulse-outline"
              onValueChange={(value) => setSetting("scannerVibration", value)}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Sound Effects"
              value={settings.scannerSound}
              type="switch"
              icon="musical-note-outline"
              onValueChange={(value) => setSetting("scannerSound", value)}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Auto Submit Scan"
              value={settings.scannerAutoSubmit}
              type="switch"
              icon="checkmark-circle-outline"
              onValueChange={(value) => setSetting("scannerAutoSubmit", value)}
            />
          </GlassCard>
        </Animated.View>

        {/* Security Settings */}
        <Animated.View entering={FadeInDown.delay(450).springify()}>
          <Text style={styles.sectionTitle}>Security</Text>
          <GlassCard intensity={15} padding={0} style={styles.card}>
            <AnimatedPressable
              style={styles.settingRow}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setShowChangePinModal(true);
              }}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                </View>
                <Text style={styles.settingLabel}>Change PIN</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </AnimatedPressable>

            <View style={styles.divider} />

            <AnimatedPressable
              style={styles.settingRow}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setShowChangePasswordModal(true);
              }}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                </View>
                <Text style={styles.settingLabel}>Change Password</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>

        {/* Navigation Actions */}
        <Animated.View entering={FadeInDown.delay(550).springify()}>
          <Text style={styles.sectionTitle}>Management</Text>
          <GlassCard intensity={15} padding={0} style={styles.card}>
            <AnimatedPressable
              style={styles.settingRow}
              onPress={() => router.push("/supervisor/db-mapping")}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                </View>
                <Text style={styles.settingLabel}>Database Mapping</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </AnimatedPressable>

            <View style={styles.divider} />

            <AnimatedPressable
              style={styles.settingRow}
              onPress={() => router.push("/help" as any)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                </View>
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </AnimatedPressable>
          </GlassCard>
        </Animated.View>

        {/* Reset Button */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          style={styles.resetContainer}
        >
          <AnimatedPressable style={styles.resetButton} onPress={handleReset}>
            <Ionicons
              name="refresh"
              size={18}
              color={theme.colors.error.main}
            />
            <Text style={styles.resetText}>Reset to Defaults</Text>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <ChangePinModal
        visible={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        onSuccess={() => {
          setShowChangePinModal(false);
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", "Your PIN has been changed successfully");
        }}
      />

      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          setShowChangePasswordModal(false);
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", "Your password has been changed successfully");
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pageTitle: {
    fontSize: 32,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    minHeight: 56,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  selectValue: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  valueText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginLeft: 56, // Align with text start
  },
  resetContainer: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(239, 68, 68, 0.1)", // Error color with low opacity
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resetText: {
    color: theme.colors.error.main,
    fontWeight: "600",
  },
});
