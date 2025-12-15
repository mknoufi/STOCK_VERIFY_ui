/**
 * Error Logs Panel - Displays recent API errors with severity and details
 * Allows viewing error details in a modal
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

interface ErrorLog {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "critical";
  message: string;
  endpoint: string;
  user_id?: string;
  stack_trace?: string;
  request_id?: string;
}

interface ErrorLogsPanelProps {
  logs: ErrorLog[];
  loading?: boolean;
  onRefresh?: () => void;
}

const LEVEL_CONFIG = {
  error: {
    color: auroraTheme.colors.error[500],
    bgColor: auroraTheme.colors.error[500] + "15",
    icon: "alert-circle" as const,
    label: "Error"
  },
  warning: {
    color: auroraTheme.colors.warning[500],
    bgColor: auroraTheme.colors.warning[500] + "15",
    icon: "alert" as const,
    label: "Warning"
  },
  critical: {
    color: auroraTheme.colors.error[700],
    bgColor: auroraTheme.colors.error[700] + "20",
    icon: "alert-octagon" as const,
    label: "Critical"
  },
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LogRow({ log, onPress }: { log: ErrorLog; onPress: () => void }) {
  const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.error;

  return (
    <TouchableOpacity
      style={[styles.logRow, { backgroundColor: config.bgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.logIcon}>
        <MaterialCommunityIcons
          name={config.icon}
          size={20}
          color={config.color}
        />
      </View>
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={[styles.logLevel, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={styles.logTime}>
            {formatDate(log.timestamp)} {formatTime(log.timestamp)}
          </Text>
        </View>
        <Text style={styles.logMessage} numberOfLines={2}>
          {log.message}
        </Text>
        <Text style={styles.logEndpoint} numberOfLines={1}>
          {log.endpoint}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={auroraTheme.colors.text.tertiary}
      />
    </TouchableOpacity>
  );
}

function ErrorDetailModal({ log, visible, onClose }: { log: ErrorLog | null; visible: boolean; onClose: () => void }) {
  if (!log) return null;

  const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.error;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Error Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={auroraTheme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={[styles.levelBadge, { backgroundColor: config.bgColor }]}>
            <MaterialCommunityIcons name={config.icon} size={16} color={config.color} />
            <Text style={[styles.levelText, { color: config.color }]}>{config.label}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Timestamp</Text>
            <Text style={styles.detailValue}>
              {new Date(log.timestamp).toLocaleString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Endpoint</Text>
            <Text style={styles.detailValue}>{log.endpoint}</Text>
          </View>

          {log.user_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User ID</Text>
              <Text style={styles.detailValue}>{log.user_id}</Text>
            </View>
          )}

          {log.request_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Request ID</Text>
              <Text style={styles.detailValue}>{log.request_id}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Message</Text>
            <Text style={styles.detailValue}>{log.message}</Text>
          </View>

          {log.stack_trace && (
            <View style={styles.stackTraceContainer}>
              <Text style={styles.detailLabel}>Stack Trace</Text>
              <View style={styles.stackTrace}>
                <Text style={styles.stackTraceText}>{log.stack_trace}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ErrorLogsPanel({ logs, loading = false }: ErrorLogsPanelProps) {
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogPress = (log: ErrorLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="alert-box"
            size={20}
            color={auroraTheme.colors.error[500]}
          />
          <Text style={styles.title}>Error Logs</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const errorCount = logs.filter(l => l.level === "error").length;
  const criticalCount = logs.filter(l => l.level === "critical").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="alert-box"
          size={20}
          color={auroraTheme.colors.error[500]}
        />
        <Text style={styles.title}>Error Logs</Text>
        {criticalCount > 0 && (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalText}>{criticalCount} Critical</Text>
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {logs.length} total • {errorCount} errors • {criticalCount} critical
        </Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={32}
            color={auroraTheme.colors.success[500]}
          />
          <Text style={styles.emptyText}>No errors logged</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LogRow log={item} onPress={() => handleLogPress(item)} />
          )}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ErrorDetailModal
        log={selectedLog}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    flex: 1,
  } as TextStyle,
  criticalBadge: {
    backgroundColor: auroraTheme.colors.error[500] + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  } as ViewStyle,
  criticalText: {
    fontSize: 11,
    fontWeight: "600",
    color: auroraTheme.colors.error[500],
  } as TextStyle,
  summary: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  } as ViewStyle,
  summaryText: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  list: {
    flex: 1,
  } as ViewStyle,
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  } as ViewStyle,
  logIcon: {
    marginRight: 10,
  } as ViewStyle,
  logContent: {
    flex: 1,
  } as ViewStyle,
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  } as ViewStyle,
  logLevel: {
    fontSize: 12,
    fontWeight: "600",
  } as TextStyle,
  logTime: {
    fontSize: 10,
    color: auroraTheme.colors.text.tertiary,
  } as TextStyle,
  logMessage: {
    fontSize: 13,
    color: auroraTheme.colors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  logEndpoint: {
    fontSize: 11,
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 14,
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  emptyText: {
    marginTop: 8,
    color: auroraTheme.colors.text.secondary,
    fontSize: 14,
  } as TextStyle,
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: auroraTheme.colors.background.primary,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
  } as TextStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  modalContent: {
    flex: 1,
    padding: 16,
  } as ViewStyle,
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  } as ViewStyle,
  levelText: {
    fontSize: 14,
    fontWeight: "600",
  } as TextStyle,
  detailRow: {
    marginBottom: 16,
  } as ViewStyle,
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  detailValue: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
  } as TextStyle,
  stackTraceContainer: {
    marginTop: 8,
  } as ViewStyle,
  stackTrace: {
    backgroundColor: auroraTheme.colors.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  } as ViewStyle,
  stackTraceText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
});

export default ErrorLogsPanel;
