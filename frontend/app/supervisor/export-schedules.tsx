/**
 * Export Schedules Screen
 * Allows creating, editing, and managing automated export schedules.
 * Refactored to use Deep Ocean Design System
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { usePermission } from "../../src/hooks/usePermission";
import {
  getExportSchedules,
  createExportSchedule,
  updateExportSchedule,
  deleteExportSchedule,
  triggerExportSchedule,
} from "../../src/services/api/api";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";

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
  const { hasPermission } = usePermission();
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

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getExportSchedules();
      setSchedules(response.data?.schedules || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load export schedules");
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [hasPermission, router, loadSchedules]);

  const handleCreateSchedule = async () => {
    try {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to create export schedule");
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to update export schedule");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await triggerExportSchedule(scheduleId);
      Alert.alert("Success", "Export triggered successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to trigger export");
    }
  };

  const openCreateModal = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
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
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || "",
      frequency: schedule.frequency,
      format: schedule.format,
    });
    setModalVisible(true);
  };

  const renderScheduleCard = (schedule: ExportSchedule, index: number) => (
    <Animated.View
      key={schedule._id}
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <GlassCard
        intensity={15}
        padding={theme.spacing.md}
        borderRadius={theme.borderRadius.lg}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary[500] + "20" },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color={theme.colors.primary[500]}
              />
            </View>
            <View>
              <Text style={styles.cardTitle}>{schedule.name}</Text>
              <View
                style={[
                  styles.badge,
                  schedule.enabled
                    ? {
                        backgroundColor: theme.colors.success.main + "20",
                        borderColor: theme.colors.success.main,
                      }
                    : {
                        backgroundColor:
                          theme.colors.text.tertiary + "20",
                        borderColor: theme.colors.text.tertiary,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: schedule.enabled
                        ? theme.colors.success.main
                        : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {schedule.enabled ? "Active" : "Disabled"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {schedule.description && (
          <Text style={styles.cardDescription}>{schedule.description}</Text>
        )}

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme.colors.text.tertiary}
            />
            <Text style={styles.cardDetailText}>
              Frequency:{" "}
              <Text
                style={{
                  color: theme.colors.text.primary,
                  fontWeight: "600",
                }}
              >
                {schedule.frequency}
              </Text>
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={theme.colors.text.tertiary}
            />
            <Text style={styles.cardDetailText}>
              Format:{" "}
              <Text
                style={{
                  color: theme.colors.text.primary,
                  fontWeight: "600",
                }}
              >
                {schedule.format.toUpperCase()}
              </Text>
            </Text>
          </View>
          {schedule.next_run && (
            <View style={styles.detailRow}>
              <Ionicons
                name="play-skip-forward-outline"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.cardDetailText}>
                Next Run:{" "}
                <Text style={{ color: theme.colors.text.primary }}>
                  {new Date(schedule.next_run).toLocaleString()}
                </Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <AnimatedPressable
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary[500] },
            ]}
            onPress={() => handleTriggerSchedule(schedule._id)}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Run Now</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.warning.main },
            ]}
            onPress={() => openEditModal(schedule)}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.error.main },
            ]}
            onPress={() => handleDeleteSchedule(schedule._id)}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </AnimatedPressable>
        </View>
      </GlassCard>
    </Animated.View>
  );

  return (
    <ScreenContainer>
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
                color={theme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Export Schedules</Text>
              <Text style={styles.pageSubtitle}>Manage automated reports</Text>
            </View>
          </View>
          <AnimatedPressable
            style={[
              styles.createButton,
              { backgroundColor: theme.colors.success.main },
            ]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>New</Text>
          </AnimatedPressable>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary[500]}
            />
            <Text style={styles.loadingText}>Loading schedules...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {schedules.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="calendar-outline"
                  size={64}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No export schedules found
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Create a schedule to automatically export data
                </Text>
              </View>
            ) : (
              schedules.map((schedule, index) =>
                renderScheduleCard(schedule, index),
              )
            )}
          </ScrollView>
        )}

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <ScreenContainer
            containerStyle={styles.modalOverlay}
          >
            <GlassCard
              intensity={20}
              borderRadius={theme.borderRadius.xl}
              padding={theme.spacing.xl}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                </Text>
                <AnimatedPressable onPress={() => setModalVisible(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.text.primary}
                  />
                </AnimatedPressable>
              </View>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Schedule Name"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Description (optional)"
                placeholderTextColor={theme.colors.text.tertiary}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
              />

              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.optionGroup}>
                {["daily", "weekly", "monthly"].map((freq) => (
                  <AnimatedPressable
                    key={freq}
                    style={[
                      styles.optionButton,
                      formData.frequency === freq && {
                        backgroundColor: theme.colors.primary[500],
                        borderColor: theme.colors.primary[500],
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, frequency: freq })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.frequency === freq && {
                          color: "#fff",
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Format</Text>
              <View style={styles.optionGroup}>
                {["excel", "csv", "json"].map((fmt) => (
                  <AnimatedPressable
                    key={fmt}
                    style={[
                      styles.optionButton,
                      formData.format === fmt && {
                        backgroundColor: theme.colors.primary[500],
                        borderColor: theme.colors.primary[500],
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, format: fmt })}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.format === fmt && {
                          color: "#fff",
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {fmt.toUpperCase()}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <AnimatedPressable
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                    },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    Cancel
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.colors.primary[500] },
                  ]}
                  onPress={
                    editingSchedule
                      ? handleUpdateSchedule
                      : handleCreateSchedule
                  }
                >
                  <Text style={styles.modalButtonText}>
                    {editingSchedule ? "Update" : "Create"}
                  </Text>
                </AnimatedPressable>
              </View>
            </GlassCard>
          </ScreenContainer>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pageTitle: {
    fontSize: 32,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    fontWeight: "bold",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.badge,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  cardDetails: {
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDetailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  cardActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: theme.colors.text.primary,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  optionGroup: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  optionButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
