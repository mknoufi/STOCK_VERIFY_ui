import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Switch } from "../../src/components/ui/Switch";
import { usePermission } from "../../src/hooks/usePermission";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../../src/services/api";

export default function MasterSettingsScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
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
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={24} color="#007AFF" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderInput = (
    label: string,
    key: string,
    keyboardType: "default" | "numeric" = "default",
    description?: string,
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={settings?.[key]?.toString() || ""}
        onChangeText={(text) => {
          const value = keyboardType === "numeric" ? parseInt(text) || 0 : text;
          updateSetting(key, value);
        }}
        keyboardType={keyboardType}
        placeholder={label}
      />
      {description && (
        <Text style={styles.inputDescription}>{description}</Text>
      )}
    </View>
  );

  const renderSwitch = (label: string, key: string, description?: string) => (
    <View style={styles.switchContainer}>
      <View style={styles.switchTextContainer}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && (
          <Text style={styles.switchDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={settings?.[key] || false}
        onValueChange={(value) => updateSetting(key, value)}
        accessibilityLabel={label}
        accessibilityHint={description}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving || !settings}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* API Settings */}
        <View style={styles.section}>
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
        <View style={styles.section}>
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
        <View style={styles.section}>
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
        <View style={styles.section}>
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
        <View style={styles.section}>
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
        <View style={styles.section}>
          {renderSectionHeader("Database", "server-outline")}
          {renderInput("MongoDB Pool Size", "mongo_pool_size", "numeric")}
          {renderInput("SQL Pool Size", "sql_pool_size", "numeric")}
          {renderInput("Query Timeout (seconds)", "query_timeout", "numeric")}
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          {renderSectionHeader("Security", "shield-checkmark-outline")}
          {renderInput("Min Password Length", "password_min_length", "numeric")}
          {renderSwitch("Require Uppercase", "password_require_uppercase")}
          {renderSwitch("Require Lowercase", "password_require_lowercase")}
          {renderSwitch("Require Numbers", "password_require_numbers")}
          {renderInput("JWT Expiration (seconds)", "jwt_expiration", "numeric")}
        </View>

        {/* Performance Settings */}
        <View style={styles.section}>
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
          <Text style={styles.footerText}>
            Note: Some changes may require a system restart to take full effect.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputDescription: {
    fontSize: 12,
    color: "#999",
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
    color: "#333",
  },
  switchDescription: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  footer: {
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  footerText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});
