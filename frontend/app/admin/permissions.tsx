import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  LoadingSpinner,
  AnimatedPressable,
  ScreenContainer,
} from "../../src/components/ui";
import {
  getAvailablePermissions,
  getUserPermissions,
  addUserPermissions,
  removeUserPermissions,
} from "../../src/services/api";
import { auroraTheme } from "../../src/theme/auroraTheme";

export default function PermissionsScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
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
                  <AnimatedPressable
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
                  </AnimatedPressable>
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
      <ScreenContainer
        gradient
        header={{
          title: "Permission Management",
          subtitle: "User Access Control",
          showBackButton: true,
        }}
      >
        <View style={styles.centered}>
          <LoadingSpinner size={36} color={auroraTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      gradient
      header={{
        title: "Permission Management",
        subtitle: "User Access Control",
        showBackButton: true,
      }}
    >
      <View style={styles.controlPanel}>
        <Text style={styles.sectionTitle}>User Permissions</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={auroraTheme.colors.text.muted}
            value={selectedUsername}
            onChangeText={setSelectedUsername}
            autoCapitalize="none"
          />
          <AnimatedPressable
            style={styles.loadButton}
            onPress={() => loadUserPermissions(selectedUsername)}
          >
            <Text style={styles.loadButtonText}>Load</Text>
          </AnimatedPressable>
        </View>

        <Text style={styles.sectionTitle}>Search Permissions</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by category or permission name"
          placeholderTextColor={auroraTheme.colors.text.muted}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: auroraTheme.colors.text.primary,
    fontSize: 16,
  },
  controlPanel: {
    padding: auroraTheme.spacing.lg,
    backgroundColor: auroraTheme.colors.surface.base,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: auroraTheme.colors.surface.elevated,
    color: auroraTheme.colors.text.primary,
    padding: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
  },
  loadButton: {
    backgroundColor: auroraTheme.colors.primary[500],
    padding: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
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
    padding: auroraTheme.spacing.lg,
    backgroundColor: auroraTheme.colors.surface.base,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  statsText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  categoryContainer: {
    padding: auroraTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: auroraTheme.colors.success[500],
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: auroraTheme.spacing.md,
    backgroundColor: auroraTheme.colors.surface.elevated,
    borderRadius: auroraTheme.borderRadius.md,
    marginBottom: 8,
  },
  permissionText: {
    flex: 1,
    color: auroraTheme.colors.text.primary,
    fontSize: 14,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  addButton: {
    backgroundColor: auroraTheme.colors.success[500],
  },
  removeButton: {
    backgroundColor: auroraTheme.colors.error[500],
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
