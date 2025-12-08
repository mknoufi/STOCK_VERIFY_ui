/**
 * Database Mapping Configuration Screen
 * Allows supervisors to select tables and columns for ERP mapping
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/layout/Header";
import { useTheme } from "../../src/hooks/useTheme";
import {
  getAvailableTables,
  getTableColumns,
  getCurrentMapping,
  testMapping,
  saveMapping,
  getERPConfig,
} from "../../src/services/api/api";
import { useToast } from "../../src/components/feedback/ToastProvider";

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
  const theme = useTheme();
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

  // Standard app fields that need mapping

  const loadDefaultConnectionParams = React.useCallback(async () => {
    try {
      // First, try to get ERP config from backend
      try {
        const config = await getERPConfig();
        if (config) {
          if (config.host) setHost(config.host);
          if (config.port) setPort(config.port.toString());
          if (config.database) setDatabase(config.database);
          if (config.user) setUser(config.user);
          if (config.password) setPassword(config.password);
          if (config.schema) setSchema(config.schema || "dbo");
          return; // Successfully loaded from backend, no need to check storage
        }
      } catch {
        // If endpoint doesn't exist or fails, try AsyncStorage
        console.log("Could not load ERP config from backend, trying storage");
      }

      // Fallback: Try to load from AsyncStorage (saved from previous sessions)
      const savedHost = await AsyncStorage.getItem("db_mapping_host");
      const savedPort = await AsyncStorage.getItem("db_mapping_port");
      const savedDatabase = await AsyncStorage.getItem("db_mapping_database");
      const savedUser = await AsyncStorage.getItem("db_mapping_user");
      const savedPassword = await AsyncStorage.getItem("db_mapping_password");
      const savedSchema = await AsyncStorage.getItem("db_mapping_schema");

      if (savedHost) setHost(savedHost);
      if (savedPort) setPort(savedPort);
      if (savedDatabase) setDatabase(savedDatabase);
      if (savedUser) setUser(savedUser);
      if (savedPassword) setPassword(savedPassword);
      if (savedSchema) setSchema(savedSchema);
    } catch (error: any) {
      console.error("Failed to load default connection params:", error);
    }
  }, []);

  const loadCurrentMapping = React.useCallback(async () => {
    try {
      const response = await getCurrentMapping();
      if (response && response.mapping) {
        // Convert to mapping state
        if (response.mapping.columns) {
          const mappedColumns: Record<string, ColumnMapping> = {};
          Object.entries(response.mapping.columns).forEach(
            ([key, value]: [string, any]) => {
              mappedColumns[key] = {
                app_field: key,
                erp_column: value.erp_column || value,
                table_name: value.table_name || selectedTable,
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
          }
        }
      }
    } catch {
      show("Failed to load current mapping", "error");
    }
  }, [selectedTable, show]);

  useEffect(() => {
    loadDefaultConnectionParams();
    loadCurrentMapping();
  }, [loadDefaultConnectionParams, loadCurrentMapping]);

  const handleLoadTables = async () => {
    if (!host || !database) {
      show("Please enter host and database", "error");
      return;
    }

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
      show(
        `Failed to load columns: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectColumn = (appField: string) => {
    setSelectedAppField(appField);
    setShowColumnModal(true);
  };

  const handleMapColumn = (columnName: string) => {
    if (!selectedTable) {
      show("Please select a table first", "error");
      return;
    }

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
        Alert.alert(
          "Mapping Test Successful",
          `Query executed successfully.\n\nSample data: ${JSON.stringify(response.sample_data, null, 2)}`,
          [{ text: "OK" }],
        );
      }
    } catch (error: any) {
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
      show(
        `Missing required fields: ${missingFields.map((f) => f.label).join(", ")}`,
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      const config = {
        tables: { items: selectedTable },
        columns: mapping,
        query_options: {
          schema_name: schema,
        },
      };

      const response = await saveMapping(config);
      if (response.success) {
        // Save connection parameters for next time
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
      show(
        `Failed to save mapping: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Header
        title="Database Mapping"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Connection Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Connection Settings
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Host
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={host}
              onChangeText={setHost}
              placeholder="SQL Server host"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Port
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={port}
              onChangeText={setPort}
              placeholder="1433"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Database
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={database}
              onChangeText={setDatabase}
              placeholder="Database name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Schema
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={schema}
              onChangeText={setSchema}
              placeholder="dbo"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              User (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={user}
              onChangeText={setUser}
              placeholder="Username"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Password (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleLoadTables}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={styles.buttonText}>Load Tables</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tables */}
        {tables.length > 0 && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Select Table ({tables.length} tables)
            </Text>
            {tables.map((table) => (
              <TouchableOpacity
                key={table.name}
                style={[
                  styles.tableItem,
                  selectedTable === table.name && {
                    backgroundColor: theme.colors.primary + "20",
                  },
                ]}
                onPress={() => handleLoadColumns(table.name)}
              >
                <Ionicons
                  name={
                    selectedTable === table.name ? "checkbox" : "square-outline"
                  }
                  size={24}
                  color={
                    selectedTable === table.name
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text style={[styles.tableName, { color: theme.colors.text }]}>
                  {table.schema}.{table.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Column Mapping */}
        {selectedTable && columns.length > 0 && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Map Columns ({columns.length} columns available)
            </Text>

            {appFields.map((field) => {
              const mappedColumn = mapping[field.key];
              return (
                <View key={field.key} style={styles.mappingRow}>
                  <View style={styles.mappingField}>
                    <Text
                      style={[styles.fieldLabel, { color: theme.colors.text }]}
                    >
                      {field.label}
                      {field.required && (
                        <Text style={{ color: theme.colors.error }}> *</Text>
                      )}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.columnButton,
                        {
                          backgroundColor: mappedColumn
                            ? theme.colors.success + "20"
                            : theme.colors.background,
                        },
                      ]}
                      onPress={() => handleSelectColumn(field.key)}
                    >
                      <Text
                        style={[
                          styles.columnButtonText,
                          {
                            color: mappedColumn
                              ? theme.colors.success
                              : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {mappedColumn
                          ? mappedColumn.erp_column
                          : "Select column..."}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        {Object.keys(mapping).length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={handleTestMapping}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Test Mapping</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleSaveMapping}
              disabled={loading}
            >
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Mapping</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Column Selection Modal */}
      <Modal
        visible={showColumnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColumnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Column for{" "}
                {appFields.find((f) => f.key === selectedAppField)?.label}
              </Text>
              <TouchableOpacity onPress={() => setShowColumnModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {columns.map((column) => (
                <TouchableOpacity
                  key={column.name}
                  style={[
                    styles.columnItem,
                    { backgroundColor: theme.colors.background },
                  ]}
                  onPress={() => handleMapColumn(column.name)}
                >
                  <View>
                    <Text
                      style={[styles.columnName, { color: theme.colors.text }]}
                    >
                      {column.name}
                    </Text>
                    <Text
                      style={[
                        styles.columnType,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {column.data_type}
                      {column.max_length && `(${column.max_length})`}
                      {column.nullable && " - Nullable"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  section: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tableItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  tableName: {
    fontSize: 16,
  },
  mappingRow: {
    marginBottom: 16,
  },
  mappingField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  columnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  columnButtonText: {
    fontSize: 16,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalScroll: {
    flex: 1,
  },
  columnItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  columnName: {
    fontSize: 16,
    fontWeight: "500",
  },
  columnType: {
    fontSize: 12,
    marginTop: 4,
  },
});
