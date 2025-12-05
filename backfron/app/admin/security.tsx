import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface SecuritySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function AdminSecurity() {
  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: "1",
      title: "Two-Factor Authentication",
      description: "Require 2FA for all admin accounts",
      enabled: true,
      icon: "shield-checkmark",
    },
    {
      id: "2",
      title: "Login Notifications",
      description: "Email alerts for new device logins",
      enabled: true,
      icon: "mail",
    },
    {
      id: "3",
      title: "Session Timeout",
      description: "Auto-logout after 15 minutes of inactivity",
      enabled: false,
      icon: "timer",
    },
    {
      id: "4",
      title: "IP Whitelisting",
      description: "Restrict access to specific IP addresses",
      enabled: false,
      icon: "globe",
    },
  ]);

  const toggleSwitch = (id: string) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting,
      ),
    );
  };

  return (
    <AdminLayout title="Security Settings" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Configure system security policies
          </Text>
        </View>

        <View style={styles.grid}>
          {settings.map((setting) => (
            <PremiumCard
              key={setting.id}
              variant="elevated"
              style={styles.settingCard}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: setting.enabled
                        ? `${modernColors.success.main}20`
                        : `${modernColors.neutral[500]}20`,
                    },
                  ]}
                >
                  <Ionicons
                    name={setting.icon}
                    size={24}
                    color={
                      setting.enabled
                        ? modernColors.success.main
                        : modernColors.neutral[500]
                    }
                  />
                </View>
                <Switch
                  trackColor={{
                    false: modernColors.neutral[700],
                    true: modernColors.primary[500],
                  }}
                  thumbColor={modernColors.text.primary}
                  ios_backgroundColor={modernColors.neutral[700]}
                  onValueChange={() => toggleSwitch(setting.id)}
                  value={setting.enabled}
                />
              </View>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingDescription}>
                {setting.description}
              </Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: setting.enabled
                        ? modernColors.success.main
                        : modernColors.neutral[500],
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: setting.enabled
                        ? modernColors.success.main
                        : modernColors.neutral[500],
                    },
                  ]}
                >
                  {setting.enabled ? "Enabled" : "Disabled"}
                </Text>
              </View>
            </PremiumCard>
          ))}
        </View>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  } as ViewStyle,
  header: {
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  } as ViewStyle,
  settingCard: {
    width: "100%",
    padding: modernSpacing.md,
    marginBottom: modernSpacing.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.md,
  } as ViewStyle,
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  settingTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  settingDescription: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.md,
  } as TextStyle,
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  statusText: {
    ...modernTypography.label.small,
    fontWeight: "600",
  } as TextStyle,
});
