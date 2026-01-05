/**
 * Error Logs Panel - Enterprise Grade
 * Displays operational error logs with lifecycle management, grouping, and detailed analysis hooks.
 * Version: 2.1.1 // Force refresh
 *
 * // cSpell:ignore nums
 */

import React, { useState, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  modernColors,
  modernShadows,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";
import { copyToClipboard } from "../../utils/clipboard";

// --- Domain Types ---

export type ErrorSeverity = "error" | "warning" | "critical";
export type ErrorStatus = "active" | "acknowledged" | "resolved";

export interface ErrorLog {
  id: string;
  reference_id?: string; // For support tickets (e.g. ERR-1234)
  timestamp: string; // ISO String
  level: ErrorSeverity;
  status: ErrorStatus;
  message: string;
  endpoint: string;
  user_id?: string;
  stack_trace?: string;
  request_id?: string;
  count?: number; // For grouped logs
}

interface ErrorLogsPanelProps {
  logs: ErrorLog[];
  loading?: boolean;
  onRefresh?: () => void;
  // User Actions
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onCopyReference?: (ref: string) => void;
  /** Whether the list should be scrollable. Default: true */
  scrollEnabled?: boolean;
}

// --- Configuration ---

const SEVERITY_CONFIG: Record<
  ErrorSeverity,
  {
    color: string;
    bgColor: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
  }
> = {
  error: {
    color: modernColors.error.main,
    bgColor: modernColors.error.main + "15",
    icon: "alert-circle",
    label: "Error",
  },
  warning: {
    color: modernColors.warning.main,
    bgColor: modernColors.warning.main + "15",
    icon: "alert",
    label: "Warning",
  },
  critical: {
    color: modernColors.error.dark,
    bgColor: modernColors.error.dark + "20",
    icon: "alert-octagon",
    label: "Critical",
  },
};

const STATUS_CONFIG: Record<
  ErrorStatus,
  {
    color: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
  }
> = {
  active: {
    color: modernColors.error.main,
    icon: "radiobox-marked",
    label: "Active",
  },
  acknowledged: {
    color: modernColors.warning.main,
    icon: "eye-check",
    label: "Ack",
  },
  resolved: {
    color: modernColors.success.main,
    icon: "check-circle",
    label: "Resolved",
  },
};

// --- Utils ---

function formatDateTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

// --- Components ---

const LogRow = React.memo(
  ({
    log,
    onPress,
    onAcknowledge,
  }: {
    log: ErrorLog;
    onPress: () => void;
    onAcknowledge?: (id: string) => void;
  }) => {
    const config = SEVERITY_CONFIG[log.level];
    const statusInfo = STATUS_CONFIG[log.status];

    return (
      <TouchableOpacity
        style={[
          styles.logRow,
          {
            backgroundColor: config.bgColor,
            opacity: log.status === "resolved" ? 0.6 : 1,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.logIconContainer}>
          <MaterialCommunityIcons
            name={config.icon}
            size={22}
            color={config.color}
          />
          {log.count && log.count > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {log.count > 99 ? "99+" : log.count}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <Text style={[styles.logLevel, { color: config.color }]}>
              {config.label}
            </Text>
            <View style={styles.metaContainer}>
              {log.status !== "active" && (
                <View
                  style={[
                    styles.statusBadge,
                    { borderColor: statusInfo.color },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={statusInfo.icon}
                    size={10}
                    color={statusInfo.color}
                  />
                  <Text
                    style={[styles.statusText, { color: statusInfo.color }]}
                  >
                    {statusInfo.label}
                  </Text>
                </View>
              )}
              <Text style={styles.logTime}>
                {formatDateTime(log.timestamp)}
              </Text>
            </View>
          </View>
          <Text style={styles.logMessage} numberOfLines={2}>
            {log.message}
          </Text>
          <Text style={styles.logEndpoint} numberOfLines={1}>
            {log.endpoint}
          </Text>
        </View>

        <View style={styles.actions}>
          {/* Quick Action: Acknowledge if active */}
          {log.status === "active" && onAcknowledge && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onAcknowledge(log.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="eye-check"
                size={20}
                color={modernColors.text.tertiary}
              />
            </TouchableOpacity>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={modernColors.text.tertiary}
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>
    );
  },
);

LogRow.displayName = "LogRow";

interface DetailModalProps {
  log: ErrorLog | null;
  visible: boolean;
  onClose: () => void;
  onResolve?: (id: string) => void;
}

function ErrorDetailModal({
  log,
  visible,
  onClose,
  onResolve,
}: DetailModalProps) {
  if (!log) return null;

  const config = SEVERITY_CONFIG[log.level];

  const handleCopy = async (label: string, text?: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      // Could show a toast here
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTitle}>
            <MaterialCommunityIcons
              name={config.icon}
              size={24}
              color={config.color}
            />
            <Text style={styles.modalTitle}>Error Details</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={modernColors.text.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Primary Info */}
          <View style={styles.section}>
            <Text style={styles.logMessageLarge}>{log.message}</Text>
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.tagText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: modernColors.background.paper,
                    borderWidth: 1,
                    borderColor: modernColors.border.light,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: modernColors.text.secondary },
                  ]}
                >
                  {log.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Operational Actions */}
          {log.status !== "resolved" && onResolve && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => {
                onResolve(log.id);
                onClose();
              }}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={20}
                color="white"
              />
              <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
          )}

          {/* Details Table */}
          <View style={styles.detailsCard}>
            <DetailRow
              label="Timestamp"
              value={formatDateTime(log.timestamp)}
            />
            <DetailRow label="Endpoint" value={log.endpoint} canCopy />
            {log.reference_id && (
              <DetailRow
                label="Reference ID"
                value={log.reference_id}
                canCopy
              />
            )}
            {log.user_id && (
              <DetailRow label="User ID" value={log.user_id} canCopy />
            )}
            {log.request_id && (
              <DetailRow label="Request ID" value={log.request_id} canCopy />
            )}
          </View>

          {/* Stack Trace */}
          {log.stack_trace && (
            <View style={styles.stackTraceContainer}>
              <View style={styles.stackHeader}>
                <Text style={styles.detailLabel}>Stack Trace</Text>
                <TouchableOpacity
                  onPress={() => handleCopy("Stack Trace", log.stack_trace)}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={16}
                    color={modernColors.primary[500]}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal style={styles.stackTraceScroll}>
                <View style={styles.stackTrace}>
                  <Text style={styles.stackTraceText}>{log.stack_trace}</Text>
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const DetailRow = ({
  label,
  value,
  canCopy,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.detailValueContainer}>
      <Text style={styles.detailValue} selectable>
        {value}
      </Text>
      {canCopy && (
        <TouchableOpacity
          onPress={() => copyToClipboard(value)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="content-copy"
            size={16}
            color={modernColors.text.tertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export function ErrorLogsPanel({
  logs,
  loading = false,
  onAcknowledge,
  onResolve,
  scrollEnabled = true,
}: ErrorLogsPanelProps) {
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogPress = (log: ErrorLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="alert-box"
            size={20}
            color={modernColors.error.main}
          />
          <Text style={styles.title}>Error Logs</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const criticalCount = logs.filter(
    (l) => l.level === "critical" && l.status === "active",
  ).length;
  const errorCount = logs.filter(
    (l) => l.level === "error" && l.status === "active",
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons
            name="alert-box"
            size={20}
            color={modernColors.error.main}
          />
          <Text style={styles.title}>Error Logs</Text>
        </View>
        {criticalCount > 0 && (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalText}>{criticalCount} Critical</Text>
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View
            style={[styles.dot, { backgroundColor: modernColors.error.main }]}
          />
          <Text style={styles.summaryText}>
            {errorCount + criticalCount} active
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View
            style={[styles.dot, { backgroundColor: modernColors.success.main }]}
          />
          <Text style={styles.summaryText}>
            {logs.filter((l) => l.status === "resolved").length} resolved
          </Text>
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={32}
            color={modernColors.success.main}
          />
          <Text style={styles.emptyText}>System Healthy</Text>
        </View>
      ) : (
        <FlashList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LogRow
              log={item}
              onPress={() => handleLogPress(item)}
              onAcknowledge={onAcknowledge}
            />
          )}
          // @ts-ignore - estimatedItemSize required by FlashList
          estimatedItemSize={80}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ErrorDetailModal
        log={selectedLog}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onResolve={onResolve}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.card,
    padding: 16,
    minHeight: 200,
    flex: 1,
    ...modernShadows.sm,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: modernColors.text.primary,
    letterSpacing: -0.3,
  } as TextStyle,
  criticalBadge: {
    backgroundColor: modernColors.error.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: modernBorderRadius.full,
  } as ViewStyle,
  criticalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  } as TextStyle,
  summary: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  } as ViewStyle,
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  summaryText: {
    fontSize: 12,
    color: modernColors.text.secondary,
    fontWeight: "500",
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
    borderWidth: 1,
    borderColor: "transparent",
  } as ViewStyle,
  logIconContainer: {
    marginRight: 10,
    position: "relative",
  } as ViewStyle,
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: modernColors.text.primary,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  } as ViewStyle,
  countText: {
    color: "white",
    fontSize: 8,
    fontWeight: "700",
  } as TextStyle,
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
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    paddingVertical: 1,
  } as ViewStyle,
  statusText: {
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
  } as TextStyle,
  logTime: {
    fontSize: 10,
    color: modernColors.text.tertiary,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  logMessage: {
    fontSize: 13,
    color: modernColors.text.primary,
    marginBottom: 2,
    lineHeight: 18,
  } as TextStyle,
  logEndpoint: {
    fontSize: 11,
    color: modernColors.text.secondary,
    fontFamily: "monospace", // If available, otherwise falls back
  } as TextStyle,
  actions: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  actionButton: {
    padding: 4,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    color: modernColors.text.secondary,
    fontSize: 14,
    fontWeight: "500",
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  } as ViewStyle,
  emptyText: {
    marginTop: 8,
    color: modernColors.text.secondary,
    fontSize: 14,
  } as TextStyle,
  // Modal stats
  modalContainer: {
    flex: 1,
    backgroundColor: modernColors.background.paper,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  } as ViewStyle,
  modalHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.text.primary,
  } as TextStyle,
  closeButton: {
    padding: 4,
  } as ViewStyle,
  modalContent: {
    flex: 1,
    padding: 16,
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  logMessageLarge: {
    fontSize: 16,
    color: modernColors.text.primary,
    fontWeight: "500",
    marginBottom: 12,
  } as TextStyle,
  tagsRow: {
    flexDirection: "row",
    gap: 8,
  } as ViewStyle,
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  } as ViewStyle,
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  } as TextStyle,
  resolveButton: {
    backgroundColor: modernColors.success.main,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
    ...modernShadows.sm,
  } as ViewStyle,
  resolveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  } as TextStyle,
  detailsCard: {
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  } as ViewStyle,
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  } as ViewStyle,
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: modernColors.text.secondary,
  } as TextStyle,
  detailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
    marginLeft: 16,
  } as ViewStyle,
  detailValue: {
    fontSize: 13,
    color: modernColors.text.primary,
    textAlign: "right",
  } as TextStyle,
  stackTraceContainer: {
    marginTop: 8,
  } as ViewStyle,
  stackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as ViewStyle,
  stackTraceScroll: {
    maxHeight: 200,
  },
  stackTrace: {
    backgroundColor: modernColors.background.elevated,
    padding: 12,
    borderRadius: modernBorderRadius.md,
  } as ViewStyle,
  stackTraceText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: modernColors.text.secondary,
  } as TextStyle,
});

export default ErrorLogsPanel;
