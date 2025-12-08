import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { usePermissions } from "../../src/hooks/usePermissions";
import {
  getExportSchedules,
  createExportSchedule,
  updateExportSchedule,
  deleteExportSchedule,
  triggerExportSchedule,
} from "../../src/services/api/api";

interface ExportSchedule {
  _id: string;
  name: string;
  description?: string;
  frequency: string;
  format: string;
  filters?: any;
  enabled: boolean;
  created_by: string;
  created_at: string;
  next_run?: string;
}

export default function ExportSchedulesScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExportSchedule | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequency: "daily",
    format: "excel",
  });

  useEffect(() => {
    if (!hasPermission("export.schedule")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to access export schedules.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await getExportSchedules();
      setSchedules(response.data?.schedules || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load export schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await createExportSchedule(formData);
      Alert.alert("Success", "Export schedule created successfully");
      setModalVisible(false);
      setFormData({
        name: "",
        description: "",
        frequency: "daily",
        format: "excel",
      });
      loadSchedules();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create export schedule");
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      await updateExportSchedule(editingSchedule._id, formData);
      Alert.alert("Success", "Export schedule updated successfully");
      setModalVisible(false);
      setEditingSchedule(null);
      setFormData({
        name: "",
        description: "",
        frequency: "daily",
        format: "excel",
      });
      loadSchedules();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update export schedule");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this export schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExportSchedule(scheduleId);
              Alert.alert("Success", "Export schedule deleted successfully");
              loadSchedules();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to delete export schedule",
              );
            }
          },
        },
      ],
    );
  };

  const handleTriggerSchedule = async (scheduleId: string) => {
    try {
      await triggerExportSchedule(scheduleId);
      Alert.alert("Success", "Export triggered successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to trigger export");
    }
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      name: "",
      description: "",
      frequency: "daily",
      format: "excel",
    });
    setModalVisible(true);
  };

  const openEditModal = (schedule: ExportSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || "",
      frequency: schedule.frequency,
      format: schedule.format,
    });
    setModalVisible(true);
  };

  const renderScheduleCard = (schedule: ExportSchedule) => (
    <View key={schedule._id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{schedule.name}</Text>
        <View
          style={[
            styles.badge,
            schedule.enabled ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          <Text style={styles.badgeText}>
            {schedule.enabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
      </View>

      {schedule.description && (
        <Text style={styles.cardDescription}>{schedule.description}</Text>
      )}

      <View style={styles.cardDetails}>
        <Text style={styles.cardDetailText}>
          Frequency: {schedule.frequency}
        </Text>
        <Text style={styles.cardDetailText}>Format: {schedule.format}</Text>
        {schedule.next_run && (
          <Text style={styles.cardDetailText}>
            Next Run: {new Date(schedule.next_run).toLocaleString()}
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.triggerButton]}
          onPress={() => handleTriggerSchedule(schedule._id)}
        >
          <Text style={styles.actionButtonText}>▶ Trigger Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(schedule)}
        >
          <Text style={styles.actionButtonText}>✎ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSchedule(schedule._id)}
        >
          <Text style={styles.actionButtonText}>✕ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading schedules...</Text>
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
        <Text style={styles.title}>Export Schedules</Text>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {schedules.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No export schedules found</Text>
            <Text style={styles.emptyStateSubtext}>
              Create a schedule to automatically export data
            </Text>
          </View>
        ) : (
          schedules.map(renderScheduleCard)
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSchedule ? "Edit Schedule" : "Create Schedule"}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Schedule Name"
              placeholderTextColor="#666"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
            />

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.optionGroup}>
              {["daily", "weekly", "monthly"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.optionButton,
                    formData.frequency === freq && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: freq })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.frequency === freq &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Format</Text>
            <View style={styles.optionGroup}>
              {["excel", "csv", "json"].map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  style={[
                    styles.optionButton,
                    formData.format === fmt && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, format: fmt })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.format === fmt &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {fmt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={
                  editingSchedule ? handleUpdateSchedule : handleCreateSchedule
                }
              >
                <Text style={styles.modalButtonText}>
                  {editingSchedule ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#1E1E1E",
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
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  createButton: {
    backgroundColor: "#00E676",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#444",
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: "#00E676",
  },
  badgeInactive: {
    backgroundColor: "#666",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 12,
  },
  cardDetailText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  triggerButton: {
    backgroundColor: "#007AFF",
  },
  editButton: {
    backgroundColor: "#FFC107",
  },
  deleteButton: {
    backgroundColor: "#FF5252",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#252525",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  optionGroup: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#333",
  },
  optionButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionButtonText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  optionButtonTextSelected: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#666",
  },
  modalButtonPrimary: {
    backgroundColor: "#00E676",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
