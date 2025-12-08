import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { usePermissions } from "../../src/hooks/usePermissions";
import {
  getAvailablePermissions,
  getUserPermissions,
  addUserPermissions,
  removeUserPermissions,
} from "../../src/services/api";

export default function PermissionsScreen() {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState<any>(null);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user has admin permissions
  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to access this screen.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [hasRole, router]);

  // Load available permissions
  useEffect(() => {
    loadAvailablePermissions();
  }, []);

  const loadAvailablePermissions = async () => {
    try {
      setLoading(true);
      const response = await getAvailablePermissions();
      setAvailablePermissions(response.data);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (username: string) => {
    try {
      setLoading(true);
      const response = await getUserPermissions(username);
      setUserPermissions(response.data.permissions || []);
      setSelectedUsername(username);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load user permissions");
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserPermission = async (permission: string) => {
    if (!selectedUsername) {
      Alert.alert("Error", "Please enter a username first");
      return;
    }

    try {
      await addUserPermissions(selectedUsername, [permission]);
      Alert.alert("Success", "Permission added successfully");
      loadUserPermissions(selectedUsername);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add permission");
    }
  };

  const handleRemoveUserPermission = async (permission: string) => {
    if (!selectedUsername) return;

    try {
      await removeUserPermissions(selectedUsername, [permission]);
      Alert.alert("Success", "Permission removed successfully");
      loadUserPermissions(selectedUsername);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to remove permission");
    }
  };

  const renderPermissionCategories = () => {
    if (!availablePermissions?.categories) return null;

    const categories = availablePermissions.categories;
    const categoryKeys = Object.keys(categories);

    const filteredCategories = searchQuery
      ? categoryKeys.filter(
          (cat) =>
            cat.toLowerCase().includes(searchQuery.toLowerCase()) ||
            categories[cat].some((p: string) =>
              p.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        )
      : categoryKeys;

    return filteredCategories.map((category) => {
      const permissions = categories[category];
      const filteredPermissions = searchQuery
        ? permissions.filter((p: string) =>
            p.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : permissions;

      if (filteredPermissions.length === 0) return null;

      return (
        <View key={category} style={styles.categoryContainer}>
          <Text style={styles.categoryTitle}>
            {category.toUpperCase().replace("_", " ")}
          </Text>
          {filteredPermissions.map((permission: string) => {
            const hasPermission = userPermissions.includes(permission);
            return (
              <View key={permission} style={styles.permissionRow}>
                <Text style={styles.permissionText}>{permission}</Text>
                {selectedUsername && (
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      hasPermission ? styles.removeButton : styles.addButton,
                    ]}
                    onPress={() =>
                      hasPermission
                        ? handleRemoveUserPermission(permission)
                        : handleAddUserPermission(permission)
                    }
                  >
                    <Text style={styles.buttonText}>
                      {hasPermission ? "Remove" : "Add"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      );
    });
  };

  if (loading && !availablePermissions) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Permission Management</Text>
      </View>

      <View style={styles.controlPanel}>
        <Text style={styles.sectionTitle}>User Permissions</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={selectedUsername}
            onChangeText={setSelectedUsername}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.loadButton}
            onPress={() => loadUserPermissions(selectedUsername)}
          >
            <Text style={styles.loadButtonText}>Load</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Search Permissions</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by category or permission name"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            Total Permissions: {availablePermissions?.permissions?.length || 0}
          </Text>
          {selectedUsername && (
            <Text style={styles.statsText}>
              User &quot;{selectedUsername}&quot;: {userPermissions.length}{" "}
              permissions
            </Text>
          )}
        </View>

        {renderPermissionCategories()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  controlPanel: {
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  loadButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  loadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  stats: {
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  statsText: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 4,
  },
  categoryContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButton: {
    backgroundColor: "#4CAF50",
  },
  removeButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
