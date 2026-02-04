import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../../src/services/api";
import { ScreenContainer } from "../../src/components/ui/ScreenContainer";
import { useThemeContext } from "../../src/theme/ThemeContext";

type SettingItem =
  | {
      type: "input";
      label: string;
      key: string;
      keyboardType?: "numeric" | "default";
      description?: string;
    }
  | {
      type: "switch";
      label: string;
      key: string;
      description?: string;
    };

type SettingSection = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: SettingItem[];
};

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
  const { theme, isDark } = useThemeContext();
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

  const renderItem = (item: SettingItem) => {
    if (item.type === "switch") {
      return (
        <View key={item.key} style={styles.switchContainer}>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
              {item.label}
            </Text>
            {item.description && (
              <Text
                style={[
                  styles.switchDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {item.description}
              </Text>
            )}
          </View>
          <Switch
            value={settings?.[item.key] || false}
            onValueChange={(value) => updateSetting(item.key, value)}
            trackColor={{ false: "#767577", true: theme.colors.accent }}
            thumbColor={settings?.[item.key] ? "#fff" : "#f4f3f4"}
            accessibilityLabel={item.label}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings?.[item.key] || false }}
          />
        </View>
      );
    }

    return (
      <View key={item.key} style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
          {item.label}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f9f9f9",
            },
          ]}
          value={settings?.[item.key]?.toString() || ""}
          onChangeText={(text) => {
            const value =
              item.keyboardType === "numeric" ? parseInt(text) || 0 : text;
            updateSetting(item.key, value);
          }}
          keyboardType={item.keyboardType || "default"}
          placeholder={item.label}
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel={item.label}
        />
        {item.description && (
          <Text
            style={[
              styles.inputDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            {item.description}
          </Text>
        )}
      </View>
    );
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
      {SECTIONS.map((section, index) => (
        <View
          key={index}
          style={[
            styles.section,
            { backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#fff" },
          ]}
        >
          <View
            style={[
              styles.sectionHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <Ionicons name={section.icon} size={24} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
          </View>
          {section.items.map((item) => renderItem(item))}
        </View>
      ))}

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
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  inputDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
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
