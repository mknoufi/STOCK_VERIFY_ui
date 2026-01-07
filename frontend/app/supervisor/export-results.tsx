/**
 * Export Results Screen
 * Displays a list of export jobs and allows downloading completed exports.
 * Refactored to use Deep Ocean Design System
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { usePermission } from "../../src/hooks/usePermission";
import {
  getExportResults,
  downloadExportResult,
} from "../../src/services/api/api";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";

interface ExportResult {
  _id: string;
  schedule_id: string;
  schedule_name: string;
  status: string;
  format: string;
  file_path?: string;
  file_size?: number;
  record_count?: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export default function ExportResultsScreen() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (
      !hasPermission("export.view_all") &&
      !hasPermission("export.view_own")
    ) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to view export results.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const status = filterStatus === "all" ? undefined : filterStatus;
      const response = await getExportResults(undefined, status);
      setResults(response.data?.results || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load export results");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resultId: string, fileName: string) => {
    try {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDownloading(resultId);
      const blob = await downloadExportResult(resultId);

      // For web: Create download link
      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert("Success", "File downloaded successfully");
      } else {
        // For mobile: Show message that download is in progress
        Alert.alert(
          "Download",
          "Export download feature requires expo-file-system configuration",
        );
      }
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to download export");
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.colors.success.main;
      case "failed":
        return theme.colors.error.main;
      case "pending":
        return theme.colors.warning.main;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle-outline";
      case "failed":
        return "alert-circle-outline";
      case "pending":
        return "time-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const renderResultCard = (result: ExportResult, index: number) => {
    const statusColor = getStatusColor(result.status);
    return (
      <Animated.View
        key={result._id}
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
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(result.status) as any}
                  size={24}
                  color={statusColor}
                />
              </View>
              <View>
                <Text style={styles.cardTitle}>{result.schedule_name}</Text>
                <Text style={styles.cardSubtitle}>
                  {new Date(result.started_at).toLocaleString()}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColor + "20",
                  borderColor: statusColor,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {result.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.detailText}>
                Format: {result.format.toUpperCase()}
              </Text>
            </View>
            {result.record_count !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.detailText}>
                  Records: {result.record_count.toLocaleString()}
                </Text>
              </View>
            )}
            {result.file_size && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="save-outline"
                  size={16}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.detailText}>
                  Size: {formatFileSize(result.file_size)}
                </Text>
              </View>
            )}
          </View>

          {result.error_message && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={theme.colors.error.main}
              />
              <Text style={styles.errorText}>{result.error_message}</Text>
            </View>
          )}

          {result.status === "completed" && result.file_path && (
            <AnimatedPressable
              style={[
                styles.downloadButton,
                { backgroundColor: theme.colors.success.main },
              ]}
              onPress={() =>
                handleDownload(
                  result._id,
                  `export_${result.schedule_name}_${new Date().getTime()}.${result.format}`,
                )
              }
              disabled={downloading === result._id}
            >
              {downloading === result._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </>
              )}
            </AnimatedPressable>
          )}
        </GlassCard>
      </Animated.View>
    );
  };

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
              <Text style={styles.pageTitle}>Export Results</Text>
              <Text style={styles.pageSubtitle}>
                View and download generated reports
              </Text>
            </View>
          </View>
          <AnimatedPressable onPress={loadResults} style={styles.refreshButton}>
            <Ionicons
              name="refresh"
              size={24}
              color={theme.colors.primary[500]}
            />
          </AnimatedPressable>
        </Animated.View>

        {/* Filter Bar */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterBar}
            contentContainerStyle={styles.filterContent}
          >
            {["all", "completed", "failed", "pending"].map((status) => (
              <AnimatedPressable
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setFilterStatus(status);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && {
                      color: "#fff",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.loadingText}>Loading results...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No export results found
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Exports will appear here when they complete
                </Text>
              </View>
            ) : (
              results.map((result, index) => renderResultCard(result, index))
            )}
          </ScrollView>
        )}
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
    justifyContent: "space-between",
    alignItems: "center",
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
  refreshButton: {
    padding: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
  },
  filterBar: {
    marginBottom: theme.spacing.md,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  filterButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
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
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
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
  cardSubtitle: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.badge,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cardDetails: {
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error.main + "15",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  errorText: {
    color: theme.colors.error.main,
    fontSize: 14,
    flex: 1,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    gap: 8,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
