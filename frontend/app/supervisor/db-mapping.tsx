/**
 * Database Mapping Configuration Screen
 * Allows supervisors to select tables and columns for ERP mapping
 * Refactored to use Aurora Design System
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  getAvailableTables,
  getTableColumns,
  getCurrentMapping,
  testMapping,
  saveMapping,
} from "../../src/services/api/api";
import { useToast } from "../../src/components/feedback/ToastProvider";
import {
  AuroraBackground,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface Table {
  name: string;
  schema: string;
}

interface Column {
  name: string;
  data_type: string;
  nullable: boolean;
  max_length?: number;
  precision?: number;
  scale?: number;
}

interface ColumnMapping {
  app_field: string;
  erp_column: string;
  table_name: string;
  is_required: boolean;
}

const appFields = [
  { key: "item_code", label: "Item Code", required: true },
  { key: "item_name", label: "Item Name", required: true },
  { key: "barcode", label: "Barcode", required: false },
  { key: "stock_qty", label: "Stock Quantity", required: true },
  { key: "mrp", label: "MRP", required: false },
  { key: "uom_code", label: "UOM Code", required: false },
  { key: "category", label: "Category", required: false },
  { key: "warehouse", label: "Warehouse", required: false },
];

export default function DatabaseMappingScreen() {
  const router = useRouter();
  const { show } = useToast();

  // Connection settings
  const [host, setHost] = useState("");
  const [port, setPort] = useState("1433");
  const [database, setDatabase] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [schema, setSchema] = useState("dbo");

  // Data states
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<Record<string, ColumnMapping>>({});

  // UI states
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedAppField, setSelectedAppField] = useState<string>("");

  // Consolidated data loading
  const loadInitialData = React.useCallback(async () => {
    try {
      setLoading(true);
      // 1. Try to get full configuration from backend (Single Source of Truth)
      try {
        const response = await getCurrentMapping();

        if (response) {
          // Set Connection Params from Backend
          if (response.connection) {
            const conn = response.connection;
            if (conn.host) setHost(conn.host);
            if (conn.port) setPort(conn.port.toString());
            if (conn.database) setDatabase(conn.database);
            if (conn.user) setUser(conn.user);
            if (conn.password) setPassword(conn.password);
            if (conn.schema_name) setSchema(conn.schema_name);
            else if (conn.schema) setSchema(conn.schema);
          } else {
            // Fallback to AsyncStorage if no backend connection config
            const savedHost = await AsyncStorage.getItem("db_mapping_host");
            const savedPort = await AsyncStorage.getItem("db_mapping_port");
            const savedDatabase = await AsyncStorage.getItem(
              "db_mapping_database",
            );
            const savedUser = await AsyncStorage.getItem("db_mapping_user");
            const savedPassword = await AsyncStorage.getItem(
              "db_mapping_password",
            );
            const savedSchema = await AsyncStorage.getItem("db_mapping_schema");

            if (savedHost) setHost(savedHost);
            if (savedPort) setPort(savedPort);
            if (savedDatabase) setDatabase(savedDatabase);
            if (savedUser) setUser(savedUser);
            if (savedPassword) setPassword(savedPassword);
            if (savedSchema) setSchema(savedSchema);
          }

          // Set Mapping Config
          if (response.mapping) {
            if (response.mapping.columns) {
              const mappedColumns: Record<string, ColumnMapping> = {};
              Object.entries(response.mapping.columns).forEach(
                ([key, value]: [string, any]) => {
                  mappedColumns[key] = {
                    app_field: key,
                    erp_column: value.erp_column || value,
                    table_name: value.table_name || selectedTable, // Might be empty initially
                    is_required:
                      appFields.find((f) => f.key === key)?.required || false,
                  };
                },
              );
              setMapping(mappedColumns);
            }
            if (response.mapping.tables) {
              const firstTable = Object.values(
                response.mapping.tables,
              )[0] as string;
              if (firstTable) {
                setSelectedTable(firstTable);
                // Update table_name in mapping if it was missing
                setMapping((prev) => {
                  const newMap = { ...prev };
                  Object.keys(newMap).forEach((key) => {
                    const columnMapping = newMap[key];
                    if (columnMapping && !columnMapping.table_name) {
                      newMap[key] = {
                        ...columnMapping,
                        table_name: firstTable,
                      };
                    }
                  });
                  return newMap;
                });
              }
            }
          }
        }
      } catch (backendError) {
        console.log(
          "Failed to load from backend, trying local storage",
          backendError,
        );
        // Fallback to AsyncStorage on error
        const savedHost = await AsyncStorage.getItem("db_mapping_host");
        if (savedHost) setHost(savedHost);
        const savedPort = await AsyncStorage.getItem("db_mapping_port");
        if (savedPort) setPort(savedPort);
        const savedDatabase = await AsyncStorage.getItem("db_mapping_database");
        if (savedDatabase) setDatabase(savedDatabase);
        const savedUser = await AsyncStorage.getItem("db_mapping_user");
        if (savedUser) setUser(savedUser);
        const savedPassword = await AsyncStorage.getItem("db_mapping_password");
        if (savedPassword) setPassword(savedPassword);
        const savedSchema = await AsyncStorage.getItem("db_mapping_schema");
        if (savedSchema) setSchema(savedSchema);
      }
    } catch (error) {
      console.error("Error loading initial data", error);
      show("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadTables = async () => {
    // Validate required fields
    if (!host || !host.trim()) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show("Please enter a valid host address", "error");
      return;
    }

    if (!database || !database.trim()) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show("Please enter a database name", "error");
      return;
    }

    // Validate host format (IP or hostname)
    const hostTrimmed = host.trim();
    const isValidHost =
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostTrimmed) ||
      /^[a-zA-Z0-9][a-zA-Z0-9\-._]*[a-zA-Z0-9]$/.test(hostTrimmed) ||
      hostTrimmed === "localhost";
    if (!isValidHost) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show("Invalid host format. Use IP address or hostname", "error");
      return;
    }

    // Validate port if provided
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        show("Port must be a number between 1 and 65535", "error");
        return;
      }
    }

    // Validate database name (no special characters that could cause issues)
    if (!/^[a-zA-Z0-9_\-]+$/.test(database.trim())) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show("Database name contains invalid characters", "error");
      return;
    }

    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const response = await getAvailableTables(
        host,
        parseInt(port) || 1433,
        database,
        user || undefined,
        password || undefined,
        schema,
      );
      setTables(response.tables.map((name: string) => ({ name, schema })));
      show(`Found ${response.count} tables`, "success");
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(
        `Failed to load tables: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadColumns = async (tableName: string) => {
    if (!host || !database) {
      show("Please enter host and database", "error");
      return;
    }

    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLoading(true);
    setSelectedTable(tableName);
    try {
      const response = await getTableColumns(
        host,
        parseInt(port) || 1433,
        database,
        tableName,
        user || undefined,
        password || undefined,
        schema,
      );
      setColumns(response.columns);
      show(`Found ${response.count} columns`, "success");
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(
        `Failed to load columns: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectColumn = (appField: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedAppField(appField);
    setShowColumnModal(true);
  };

  const handleMapColumn = (columnName: string) => {
    if (!selectedTable) {
      show("Please select a table first", "error");
      return;
    }

    if (Platform.OS !== "web") Haptics.selectionAsync();

    const appField = selectedAppField;
    const isRequired =
      appFields.find((f) => f.key === appField)?.required || false;

    setMapping({
      ...mapping,
      [appField]: {
        app_field: appField,
        erp_column: columnName,
        table_name: selectedTable,
        is_required: isRequired,
      },
    });

    setShowColumnModal(false);
    setSelectedAppField("");
    show(`Mapped ${appField} to ${columnName}`, "success");
  };

  const handleTestMapping = async () => {
    if (!host || !database) {
      show("Please enter host and database", "error");
      return;
    }

    if (Object.keys(mapping).length === 0) {
      show("Please configure at least one mapping", "error");
      return;
    }

    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const config = {
        tables: { items: selectedTable },
        columns: mapping,
        query_options: {
          schema_name: schema,
        },
      };

      const response = await testMapping(
        config,
        host,
        parseInt(port) || 1433,
        database,
        user || undefined,
        password || undefined,
      );

      if (response.success) {
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Mapping Test Successful",
          `Query executed successfully.\n\nSample data: ${JSON.stringify(response.sample_data, null, 2)}`,
          [{ text: "OK" }],
        );
      }
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Mapping Test Failed",
        error.response?.data?.detail || error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (Object.keys(mapping).length === 0) {
      show("Please configure at least one mapping", "error");
      return;
    }

    // Check required fields
    const requiredFields = appFields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !mapping[f.key]);
    if (missingFields.length > 0) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(
        `Missing required fields: ${missingFields.map((f) => f.label).join(", ")}`,
        "error",
      );
      return;
    }

    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      // Construct full payload with connection and mapping
      const payload = {
        connection: {
          host,
          port: parseInt(port) || 1433,
          database,
          user: user || null,
          password: password || null,
          schema_name: schema,
        },
        mapping: {
          tables: { items: selectedTable },
          columns: mapping,
          query_options: {
            schema_name: schema,
          },
        },
      };

      const response = await saveMapping(payload);
      if (response.success) {
        // Save connection parameters locally too for offline fallback
        await AsyncStorage.setItem("db_mapping_host", host);
        await AsyncStorage.setItem("db_mapping_port", port);
        await AsyncStorage.setItem("db_mapping_database", database);
        if (user) await AsyncStorage.setItem("db_mapping_user", user);
        if (password)
          await AsyncStorage.setItem("db_mapping_password", password);
        await AsyncStorage.setItem("db_mapping_schema", schema);

        show("Mapping saved successfully", "success");
        router.back();
      }
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(
        `Failed to save mapping: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <StatusBar style="light" />
      <View style={styles.container}>
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
                color={auroraTheme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Database Mapping</Text>
              <Text style={styles.pageSubtitle}>Configure ERP integration</Text>
            </View>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Connection Settings */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <GlassCard
              variant="light"
              padding={auroraTheme.spacing.md}
              borderRadius={auroraTheme.borderRadius.lg}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="server-outline"
                  size={20}
                  color={auroraTheme.colors.primary[500]}
                />
                <Text style={styles.sectionTitle}>Connection Settings</Text>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Host</Text>
                  <TextInput
                    style={styles.input}
                    value={host}
                    onChangeText={setHost}
                    placeholder="SQL Server host"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Port</Text>
                  <TextInput
                    style={styles.input}
                    value={port}
                    onChangeText={setPort}
                    placeholder="1433"
                    keyboardType="numeric"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Database</Text>
                  <TextInput
                    style={styles.input}
                    value={database}
                    onChangeText={setDatabase}
                    placeholder="Database name"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Schema</Text>
                  <TextInput
                    style={styles.input}
                    value={schema}
                    onChangeText={setSchema}
                    placeholder="dbo"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>User (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={user}
                    onChangeText={setUser}
                    placeholder="Username"
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry
                    placeholderTextColor={auroraTheme.colors.text.tertiary}
                  />
                </View>
              </View>

              <AnimatedPressable
                style={[
                  styles.button,
                  { backgroundColor: auroraTheme.colors.primary[500] },
                ]}
                onPress={handleLoadTables}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Connect & Load Tables</Text>
                  </>
                )}
              </AnimatedPressable>
            </GlassCard>
          </Animated.View>

          {/* Tables */}
          {tables.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <GlassCard
                variant="light"
                padding={auroraTheme.spacing.md}
                borderRadius={auroraTheme.borderRadius.lg}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="list-outline"
                    size={20}
                    color={auroraTheme.colors.primary[500]}
                  />
                  <Text style={styles.sectionTitle}>
                    Select Table ({tables.length})
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {tables.map((table) => (
                    <AnimatedPressable
                      key={table.name}
                      style={[
                        styles.tableItem,
                        selectedTable === table.name && {
                          backgroundColor:
                            auroraTheme.colors.primary[500] + "20",
                          borderColor: auroraTheme.colors.primary[500],
                        },
                      ]}
                      onPress={() => handleLoadColumns(table.name)}
                    >
                      <Ionicons
                        name={
                          selectedTable === table.name
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          selectedTable === table.name
                            ? auroraTheme.colors.primary[500]
                            : auroraTheme.colors.text.tertiary
                        }
                      />
                      <Text
                        style={[
                          styles.tableName,
                          selectedTable === table.name && {
                            color: auroraTheme.colors.primary[500],
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {table.schema}.{table.name}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </GlassCard>
            </Animated.View>
          )}

          {/* Column Mapping */}
          {selectedTable && columns.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <GlassCard
                variant="light"
                padding={auroraTheme.spacing.md}
                borderRadius={auroraTheme.borderRadius.lg}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="git-merge-outline"
                    size={20}
                    color={auroraTheme.colors.primary[500]}
                  />
                  <Text style={styles.sectionTitle}>
                    Map Columns ({columns.length} source cols)
                  </Text>
                </View>

                {appFields.map((field) => {
                  const mappedColumn = mapping[field.key];
                  return (
                    <View key={field.key} style={styles.mappingRow}>
                      <View style={styles.mappingHeader}>
                        <Text style={styles.fieldLabel}>
                          {field.label}
                          {field.required && (
                            <Text
                              style={{ color: auroraTheme.colors.error[500] }}
                            >
                              {" "}
                              *
                            </Text>
                          )}
                        </Text>
                      </View>

                      <AnimatedPressable
                        style={[
                          styles.columnSelector,
                          mappedColumn && {
                            backgroundColor:
                              auroraTheme.colors.success[500] + "10",
                            borderColor: auroraTheme.colors.success[500],
                          },
                        ]}
                        onPress={() => handleSelectColumn(field.key)}
                      >
                        <Text
                          style={[
                            styles.columnSelectorText,
                            mappedColumn
                              ? {
                                  color: auroraTheme.colors.success[500],
                                  fontWeight: "600",
                                }
                              : { color: auroraTheme.colors.text.tertiary },
                          ]}
                        >
                          {mappedColumn
                            ? mappedColumn.erp_column
                            : "Select source column..."}
                        </Text>
                        <Ionicons
                          name={
                            mappedColumn ? "checkmark-circle" : "chevron-down"
                          }
                          size={20}
                          color={
                            mappedColumn
                              ? auroraTheme.colors.success[500]
                              : auroraTheme.colors.text.tertiary
                          }
                        />
                      </AnimatedPressable>
                    </View>
                  );
                })}
              </GlassCard>

              <View style={styles.actions}>
                <AnimatedPressable
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: auroraTheme.colors.warning[500],
                      flex: 1,
                    },
                  ]}
                  onPress={handleTestMapping}
                  disabled={loading}
                >
                  <Ionicons name="construct-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Test Mapping</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: auroraTheme.colors.primary[500],
                      flex: 1,
                    },
                  ]}
                  onPress={handleSaveMapping}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Save Configuration</Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Column Selection Modal */}
        <Modal
          visible={showColumnModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowColumnModal(false)}
        >
          <AuroraBackground
            variant="primary"
            intensity="high"
            style={styles.modalOverlay}
          >
            <GlassCard
              variant="modal"
              padding={auroraTheme.spacing.lg}
              borderRadius={auroraTheme.borderRadius.xl}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Column</Text>
                  <Text style={styles.modalSubtitle}>
                    For{" "}
                    {appFields.find((f) => f.key === selectedAppField)?.label}
                  </Text>
                </View>
                <AnimatedPressable onPress={() => setShowColumnModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={auroraTheme.colors.text.primary}
                  />
                </AnimatedPressable>
              </View>

              <ScrollView style={styles.modalScroll}>
                {columns.map((column) => (
                  <AnimatedPressable
                    key={column.name}
                    style={styles.columnItem}
                    onPress={() => handleMapColumn(column.name)}
                  >
                    <View style={styles.columnInfo}>
                      <Text style={styles.columnName}>{column.name}</Text>
                      <View style={styles.columnMetaRec}>
                        <Text style={styles.columnType}>
                          {column.data_type.toUpperCase()}
                        </Text>
                        {column.max_length && (
                          <Text style={styles.columnMeta}>
                            Length: {column.max_length}
                          </Text>
                        )}
                        {column.nullable && (
                          <Text style={styles.columnMeta}>Nullable</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color={auroraTheme.colors.primary[500]}
                    />
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </GlassCard>
          </AuroraBackground>
        </Modal>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: auroraTheme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  backButton: {
    padding: auroraTheme.spacing.xs,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  pageTitle: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize["2xl"],
    color: auroraTheme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: auroraTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: auroraTheme.spacing.md,
    paddingBottom: auroraTheme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  },
  sectionTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  inputGrid: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.md,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: auroraTheme.colors.text.primary,
    padding: 12,
    borderRadius: auroraTheme.borderRadius.md,
    fontSize: auroraTheme.typography.fontSize.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: auroraTheme.borderRadius.full,
    gap: 8,
    marginTop: auroraTheme.spacing.xs,
  },
  buttonText: {
    color: "#fff",
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: "600",
  },
  tableItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: auroraTheme.borderRadius.md,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tableName: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.primary,
  },
  mappingRow: {
    marginBottom: auroraTheme.spacing.md,
  },
  mappingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.primary,
    fontWeight: "600",
  },
  columnSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: auroraTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  columnSelectorText: {
    fontSize: auroraTheme.typography.fontSize.md,
  },
  actions: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: auroraTheme.borderRadius.full,
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
    paddingBottom: auroraTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  },
  modalTitle: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  modalScroll: {
    marginBottom: auroraTheme.spacing.sm,
  },
  columnItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  columnInfo: {
    gap: 4,
  },
  columnName: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.primary,
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  columnMetaRec: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  columnType: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.primary[500],
    fontWeight: "bold",
  },
  columnMeta: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
});
