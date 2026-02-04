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

  const renderSectionHeader = (title: string, icon: any) => (
    <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
      <Ionicons name={icon} size={24} color={theme.colors.accent} />
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
    </View>
  );

  const renderInput = (
    label: string,
    key: string,
    keyboardType: "default" | "numeric" = "default",
    description?: string,
  ) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9'
          }
        ]}
        value={settings?.[key]?.toString() || ""}
        onChangeText={(text) => {
          const value = keyboardType === "numeric" ? parseInt(text) || 0 : text;
          updateSetting(key, value);
        }}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label}
      />
      {description && (
        <Text style={[styles.inputDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
      )}
    </View>
  );

  const renderSwitch = (label: string, key: string, description?: string) => (
    <View style={styles.switchContainer}>
      <View style={styles.switchTextContainer}>
        <Text style={[styles.switchLabel, { color: theme.colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={settings?.[key] || false}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: "#767577", true: theme.colors.accent }}
        thumbColor={settings?.[key] ? "#fff" : "#f4f3f4"}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: settings?.[key] || false }}
      />
    </View>
  );

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
              { backgroundColor: theme.colors.accent, opacity: saving || !settings ? 0.7 : 1 },
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
        {/* API Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("API Configuration", "globe-outline")}
          {renderInput(
            "API Timeout (seconds)",
            "api_timeout",
            "numeric",
            "Request timeout duration",
          )}
          {renderInput(
            "Rate Limit (per minute)",
            "api_rate_limit",
            "numeric",
            "Maximum requests per minute",
          )}
        </View>

        {/* Cache Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Caching", "hardware-chip-outline")}
          {renderSwitch("Enable Caching", "cache_enabled")}
          {renderInput(
            "Cache TTL (seconds)",
            "cache_ttl",
            "numeric",
            "Time to live for cached items",
          )}
          {renderInput(
            "Max Cache Size",
            "cache_max_size",
            "numeric",
            "Maximum number of items in cache",
          )}
        </View>

        {/* Sync Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Synchronization", "sync-outline")}
          {renderSwitch("Auto Sync", "auto_sync_enabled")}
          {renderInput(
            "Sync Interval (seconds)",
            "sync_interval",
            "numeric",
            "Time between automatic syncs",
          )}
          {renderInput(
            "Batch Size",
            "sync_batch_size",
            "numeric",
            "Items per sync batch",
          )}
        </View>

        {/* Session Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Sessions", "people-outline")}
          {renderInput(
            "Session Timeout (seconds)",
            "session_timeout",
            "numeric",
          )}
          {renderInput(
            "Max Concurrent Sessions",
            "max_concurrent_sessions",
            "numeric",
          )}
        </View>

        {/* Logging Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Logging", "document-text-outline")}
          {renderSwitch("Enable Audit Log", "enable_audit_log")}
          {renderInput("Log Retention (days)", "log_retention_days", "numeric")}
          {renderInput(
            "Log Level",
            "log_level",
            "default",
            "DEBUG, INFO, WARN, ERROR",
          )}
        </View>

        {/* Database Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Database", "server-outline")}
          {renderInput("MongoDB Pool Size", "mongo_pool_size", "numeric")}
          {renderInput("SQL Pool Size", "sql_pool_size", "numeric")}
          {renderInput("Query Timeout (seconds)", "query_timeout", "numeric")}
        </View>

        {/* Security Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Security", "shield-checkmark-outline")}
          {renderInput("Min Password Length", "password_min_length", "numeric")}
          {renderSwitch("Require Uppercase", "password_require_uppercase")}
          {renderSwitch("Require Lowercase", "password_require_lowercase")}
          {renderSwitch("Require Numbers", "password_require_numbers")}
          {renderInput("JWT Expiration (seconds)", "jwt_expiration", "numeric")}
        </View>

        {/* Performance Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#fff' }]}>
          {renderSectionHeader("Performance", "speedometer-outline")}
          {renderSwitch("Enable Compression", "enable_compression")}
          {renderSwitch("Enable CORS", "enable_cors")}
          {renderInput(
            "Max Request Size (bytes)",
            "max_request_size",
            "numeric",
          )}
        </View>

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
