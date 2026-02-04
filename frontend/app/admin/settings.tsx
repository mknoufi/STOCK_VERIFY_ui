import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../../src/services/api";
import { ScreenContainer } from "../../src/components/ui/ScreenContainer";
import { useThemeContext } from "../../src/theme/ThemeContext";
import {
  SettingsForm,
  SettingSection,
} from "../../src/components/admin/SettingsForm";

const SECTIONS: SettingSection[] = [
  {
    title: "API Configuration",
    icon: "globe-outline",
    items: [
      {
        type: "input",
        label: "API Timeout (seconds)",
        key: "api_timeout",
        keyboardType: "numeric",
        description: "Request timeout duration",
      },
      {
        type: "input",
        label: "Rate Limit (per minute)",
        key: "api_rate_limit",
        keyboardType: "numeric",
        description: "Maximum requests per minute",
      },
    ],
  },
  {
    title: "Caching",
    icon: "hardware-chip-outline",
    items: [
      { type: "switch", label: "Enable Caching", key: "cache_enabled" },
      {
        type: "input",
        label: "Cache TTL (seconds)",
        key: "cache_ttl",
        keyboardType: "numeric",
        description: "Time to live for cached items",
      },
      {
        type: "input",
        label: "Max Cache Size",
        key: "cache_max_size",
        keyboardType: "numeric",
        description: "Maximum number of items in cache",
      },
    ],
  },
  {
    title: "Synchronization",
    icon: "sync-outline",
    items: [
      { type: "switch", label: "Auto Sync", key: "auto_sync_enabled" },
      {
        type: "input",
        label: "Sync Interval (seconds)",
        key: "sync_interval",
        keyboardType: "numeric",
        description: "Time between automatic syncs",
      },
      {
        type: "input",
        label: "Batch Size",
        key: "sync_batch_size",
        keyboardType: "numeric",
        description: "Items per sync batch",
      },
    ],
  },
  {
    title: "Sessions",
    icon: "people-outline",
    items: [
      {
        type: "input",
        label: "Session Timeout (seconds)",
        key: "session_timeout",
        keyboardType: "numeric",
      },
      {
        type: "input",
        label: "Max Concurrent Sessions",
        key: "max_concurrent_sessions",
        keyboardType: "numeric",
      },
    ],
  },
  {
    title: "Logging",
    icon: "document-text-outline",
    items: [
      { type: "switch", label: "Enable Audit Log", key: "enable_audit_log" },
      {
        type: "input",
        label: "Log Retention (days)",
        key: "log_retention_days",
        keyboardType: "numeric",
      },
      {
        type: "input",
        label: "Log Level",
        key: "log_level",
        keyboardType: "default",
        description: "DEBUG, INFO, WARN, ERROR",
      },
    ],
  },
  {
    title: "Database",
    icon: "server-outline",
    items: [
      {
        type: "input",
        label: "MongoDB Pool Size",
        key: "mongo_pool_size",
        keyboardType: "numeric",
      },
      {
        type: "input",
        label: "SQL Pool Size",
        key: "sql_pool_size",
        keyboardType: "numeric",
      },
      {
        type: "input",
        label: "Query Timeout (seconds)",
        key: "query_timeout",
        keyboardType: "numeric",
      },
    ],
  },
  {
    title: "Security",
    icon: "shield-checkmark-outline",
    items: [
      {
        type: "input",
        label: "Min Password Length",
        key: "password_min_length",
        keyboardType: "numeric",
      },
      {
        type: "switch",
        label: "Require Uppercase",
        key: "password_require_uppercase",
      },
      {
        type: "switch",
        label: "Require Lowercase",
        key: "password_require_lowercase",
      },
      {
        type: "switch",
        label: "Require Numbers",
        key: "password_require_numbers",
      },
      {
        type: "input",
        label: "JWT Expiration (seconds)",
        key: "jwt_expiration",
        keyboardType: "numeric",
      },
    ],
  },
  {
    title: "Performance",
    icon: "speedometer-outline",
    items: [
      { type: "switch", label: "Enable Compression", key: "enable_compression" },
      { type: "switch", label: "Enable CORS", key: "enable_cors" },
      {
        type: "input",
        label: "Max Request Size (bytes)",
        key: "max_request_size",
        keyboardType: "numeric",
      },
    ],
  },
];

export default function MasterSettingsScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to view master settings.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadSettings();
  }, [hasRole, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await getSystemSettings();
      if (response.success) {
        setSettings(response.data);
      } else {
        Alert.alert("Error", "Failed to load settings");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateSystemSettings(settings);
      if (response.success) {
        Alert.alert("Success", "Settings updated successfully");
        if (response.note) {
          Alert.alert("Note", response.note);
        }
      } else {
        Alert.alert("Error", "Failed to update settings");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <ScreenContainer
      header={{
        title: "Master Settings",
        showBackButton: true,
        showLogoutButton: false,
        customRightContent: (
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.accent,
                opacity: saving || !settings ? 0.7 : 1,
              },
            ]}
            disabled={saving || !settings}
            accessibilityRole="button"
            accessibilityLabel="Save settings"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        ),
      }}
      loading={loading}
      loadingType="spinner"
      contentMode="keyboard-scroll"
      backgroundType="aurora"
    >
      <SettingsForm
        sections={SECTIONS}
        settings={settings}
        onUpdate={updateSetting}
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Note: Some changes may require a system restart to take full effect.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  footerText: {
    textAlign: "center",
    fontStyle: "italic",
    fontSize: 13,
  },
});
