/**
 * Staff Settings Screen
 * Provides theme selection, scanner settings, and app preferences
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StaffLayout } from "../../src/components/layout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useAuthStore } from "../../src/store/authStore";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

type ThemeOption = "light" | "dark" | "auto";
type FontSizeOption = "small" | "medium" | "large";

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  value,
  onPress,
  rightElement,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.settingLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={modernColors.primary[400]} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    {rightElement || (
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={modernColors.text.tertiary}
          />
        )}
      </View>
    )}
  </TouchableOpacity>
);

interface ThemeButtonProps {
  theme: ThemeOption;
  currentTheme: ThemeOption;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onSelect: (theme: ThemeOption) => void;
}

const ThemeButton: React.FC<ThemeButtonProps> = ({
  theme,
  currentTheme,
  icon,
  label,
  onSelect,
}) => {
  const isSelected = theme === currentTheme;
  return (
    <TouchableOpacity
      style={[styles.themeButton, isSelected && styles.themeButtonSelected]}
      onPress={() => onSelect(theme)}
    >
      <Ionicons
        name={icon}
        size={24}
        color={isSelected ? modernColors.primary[400] : modernColors.text.secondary}
      />
      <Text
        style={[
          styles.themeButtonLabel,
          isSelected && styles.themeButtonLabelSelected,
        ]}
      >
        {label}
      </Text>
      {isSelected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function StaffSettings() {
  const router = useRouter();
  const { settings, setSetting, resetSettings } = useSettingsStore();
  const { user, logout } = useAuthStore();

  const handleThemeChange = (theme: ThemeOption) => {
    setSetting("theme", theme);
  };

  const handleFontSizeChange = () => {
    const sizes: FontSizeOption[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(settings.fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const nextSize = sizes[nextIndex] ?? "medium";
    setSetting("fontSize", nextSize);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "This will reset all settings to default values. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => resetSettings(),
        },
      ]
    );
  };

  const fontSizeLabels: Record<FontSizeOption, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
  };

  return (
    <StaffLayout title="Settings" showUser={false}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <PremiumCard variant="glass" style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={modernColors.primary[400]} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.full_name || user?.username || "User"}</Text>
              <Text style={styles.userRole}>{user?.role?.toUpperCase() || "STAFF"}</Text>
            </View>
          </View>
        </PremiumCard>

        {/* Theme Selection */}
        <PremiumCard variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.themeSelector}>
            <ThemeButton
              theme="light"
              currentTheme={settings.theme}
              icon="sunny"
              label="Light"
              onSelect={handleThemeChange}
            />
            <ThemeButton
              theme="dark"
              currentTheme={settings.theme}
              icon="moon"
              label="Dark"
              onSelect={handleThemeChange}
            />
            <ThemeButton
              theme="auto"
              currentTheme={settings.theme}
              icon="phone-portrait"
              label="System"
              onSelect={handleThemeChange}
            />
          </View>

          <View style={styles.divider} />

          <SettingRow
            icon="text"
            label="Font Size"
            value={fontSizeLabels[settings.fontSize]}
            onPress={handleFontSizeChange}
          />
        </PremiumCard>

        {/* Scanner Settings */}
        <PremiumCard variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Scanner</Text>
          <SettingRow
            icon="pulse"
            label="Vibration"
            rightElement={
              <Switch
                value={settings.scannerVibration}
                onValueChange={(v) => setSetting("scannerVibration", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
          <SettingRow
            icon="volume-high"
            label="Sound"
            rightElement={
              <Switch
                value={settings.scannerSound}
                onValueChange={(v) => setSetting("scannerSound", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
          <SettingRow
            icon="flash"
            label="Auto Submit"
            rightElement={
              <Switch
                value={settings.scannerAutoSubmit}
                onValueChange={(v) => setSetting("scannerAutoSubmit", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
        </PremiumCard>

        {/* Sync & Offline */}
        <PremiumCard variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Sync & Offline</Text>
          <SettingRow
            icon="sync"
            label="Auto Sync"
            rightElement={
              <Switch
                value={settings.autoSyncEnabled}
                onValueChange={(v) => setSetting("autoSyncEnabled", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
          <SettingRow
            icon="cloud-offline"
            label="Offline Mode"
            rightElement={
              <Switch
                value={settings.offlineMode}
                onValueChange={(v) => setSetting("offlineMode", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
        </PremiumCard>

        {/* Display Settings */}
        <PremiumCard variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <SettingRow
            icon="image"
            label="Show Item Images"
            rightElement={
              <Switch
                value={settings.showItemImages}
                onValueChange={(v) => setSetting("showItemImages", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
          <SettingRow
            icon="pricetag"
            label="Show Prices"
            rightElement={
              <Switch
                value={settings.showItemPrices}
                onValueChange={(v) => setSetting("showItemPrices", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
          <SettingRow
            icon="cube"
            label="Show Stock"
            rightElement={
              <Switch
                value={settings.showItemStock}
                onValueChange={(v) => setSetting("showItemStock", v)}
                trackColor={{ false: modernColors.neutral[600], true: modernColors.primary[400] }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            }
          />
        </PremiumCard>

        {/* Account Actions */}
        <PremiumCard variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingRow
            icon="refresh"
            label="Reset All Settings"
            onPress={handleResetSettings}
          />
          <SettingRow
            icon="log-out"
            label="Logout"
            onPress={handleLogout}
          />
        </PremiumCard>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Stock Verify v2.1.0</Text>
          <Text style={styles.appCopyright}>© 2025 Stock Verify</Text>
        </View>
      </ScrollView>
    </StaffLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: modernSpacing.md,
    paddingBottom: 120,
  },
  userCard: {
    marginBottom: modernSpacing.md,
    padding: modernSpacing.lg,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: modernColors.background.elevated,
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  },
  userRole: {
    ...modernTypography.label.small,
    color: modernColors.primary[400],
    marginTop: 4,
  },
  section: {
    marginBottom: modernSpacing.md,
    padding: modernSpacing.md,
  },
  sectionTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
  },
  themeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: modernSpacing.sm,
  },
  themeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: modernSpacing.md,
    borderRadius: modernBorderRadius.lg,
    backgroundColor: modernColors.background.elevated,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  themeButtonSelected: {
    borderColor: modernColors.primary[400],
    backgroundColor: `${modernColors.primary[400]}15`,
  },
  themeButtonLabel: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.xs,
  },
  themeButtonLabelSelected: {
    color: modernColors.primary[400],
    fontWeight: "600",
  },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: modernColors.primary[400],
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: modernColors.border.light,
    marginVertical: modernSpacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: modernSpacing.sm,
    minHeight: 48,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${modernColors.primary[400]}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.md,
  },
  settingLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.xs,
  },
  settingValue: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: modernSpacing.xl,
  },
  appVersion: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
  },
  appCopyright: {
    ...modernTypography.label.small,
    color: modernColors.text.disabled,
    marginTop: 4,
  },
});
