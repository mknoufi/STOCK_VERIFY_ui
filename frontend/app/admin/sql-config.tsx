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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import { ScreenContainer } from "../../src/components/ui";
import {
  getSqlServerConfig,
  updateSqlServerConfig,
  testSqlServerConnection,
} from "../../src/services/api";

export default function SqlConfigScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    host: "",
    port: 1433,
    database: "",
    username: "",
    password: "",
  });
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert("Access Denied", "Admin access required", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }
    loadConfig();
  }, [hasRole, router]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await getSqlServerConfig();
      if (response.success && response.data) {
        setConfig({
          host: response.data.host || "",
          port: response.data.port || 1433,
          database: response.data.database || "",
          username: response.data.username || "",
          password: "", // Never load password
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const response = await testSqlServerConnection(config);
      setTestResult(response.data);
      if (response.data.connected) {
        Alert.alert("Success", "Connection test successful!");
      } else {
        Alert.alert(
          "Failed",
          response.data.message || "Connection test failed",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateSqlServerConfig(config);
      if (response.success) {
        Alert.alert(
          "Success",
          "Configuration saved. Restart backend to apply changes.",
        );
        router.back();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer
        gradient
        header={{
          title: "SQL Server Configuration",
          subtitle: "Connectivity & Credentials",
          showBackButton: true,
        }}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading configuration...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      gradient
      header={{
        title: "SQL Server Configuration",
        subtitle: "Connectivity & Credentials",
        showBackButton: true,
      }}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Host *</Text>
            <TextInput
              style={styles.input}
              placeholder="localhost or IP address"
              placeholderTextColor="#666"
              value={config.host}
              onChangeText={(text) => setConfig({ ...config, host: text })}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Port *</Text>
            <TextInput
              style={styles.input}
              placeholder="1433"
              placeholderTextColor="#666"
              value={config.port.toString()}
              onChangeText={(text) =>
                setConfig({ ...config, port: parseInt(text) || 1433 })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Database *</Text>
            <TextInput
              style={styles.input}
              placeholder="Database name"
              placeholderTextColor="#666"
              value={config.database}
              onChangeText={(text) => setConfig({ ...config, database: text })}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="SQL Server username"
              placeholderTextColor="#666"
              value={config.username}
              onChangeText={(text) => setConfig({ ...config, username: text })}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty to keep current"
              placeholderTextColor="#666"
              value={config.password}
              onChangeText={(text) => setConfig({ ...config, password: text })}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        </View>

        {testResult && (
          <View
            style={[
              styles.testResult,
              {
                backgroundColor: testResult.connected
                  ? "#4CAF5020"
                  : "#f4433620",
              },
            ]}
          >
            <Ionicons
              name={testResult.connected ? "checkmark-circle" : "close-circle"}
              size={24}
              color={testResult.connected ? "#4CAF50" : "#f44336"}
            />
            <Text
              style={[
                styles.testResultText,
                { color: testResult.connected ? "#4CAF50" : "#f44336" },
              ]}
            >
              {testResult.message}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTest}
            disabled={testing || !config.host || !config.database}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={saving || !config.host || !config.database}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Save Configuration</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            SQL Server is optional. The app will work without it, but ERP sync
            features will be disabled. Restart the backend server after saving
            configuration changes.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  testResult: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  testResultText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  testButton: {
    backgroundColor: "#4CAF50",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#007AFF20",
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#007AFF",
    lineHeight: 20,
  },
});
