/**
 * Error Logs Screen - View application errors and exceptions for monitoring
 * Refactored to use Aurora Design System
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";

import {
  getErrorLogs,
  getErrorStats,
  getErrorDetail,
  resolveError,
} from "../../src/services/api/api";
import { useToast } from "../../src/components/feedback/ToastProvider";
import {
  AuroraBackground,
  GlassCard,
  StatsCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface ErrorLog {
  id: string;
  timestamp: string;
  error_type: string;
  error_message: string;
  error_code?: string;
  severity: string;
  endpoint?: string;
  method?: string;
  user?: string;
  role?: string;
  ip_address?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  stack_trace?: string;
  stack_trace_preview?: string;
  request_data?: any;
  context?: any;
}

export default function ErrorLogsScreen() {
  const router = useRouter();
  const { show } = useToast();

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [filters, setFilters] = useState({
    severity: "",
    resolved: undefined as boolean | undefined,
  });

  const loadErrors = React.useCallback(
    async (pageNum: number = 1) => {
      try {
        setLoading(pageNum === 1);
        const response = await getErrorLogs(
          pageNum,
          20,
          filters.severity || undefined,
          undefined,
          undefined,
          filters.resolved,
        );
        if (pageNum === 1) {
          setErrors(response.errors || []);
        } else {
          setErrors((prevErrors) => [
            ...prevErrors,
            ...(response.errors || []),
          ]);
        }
        setHasMore(response.pagination?.has_next || false);
      } catch {
        show("Failed to load error logs", "error");
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, show],
  );

  const loadStats = React.useCallback(async () => {
    try {
      const statsData = await getErrorStats();
      setStats(statsData);
    } catch (error: any) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  useEffect(() => {
    loadErrors();
    loadStats();
  }, [loadErrors, loadStats]);

  const handleRefresh = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setPage(1);
    await Promise.all([loadErrors(1), loadStats()]);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      const nextPage = page + 1;
      setPage(nextPage);
      loadErrors(nextPage);
    }
  };

  const handleErrorClick = async (error: ErrorLog) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    try {
      const detail = await getErrorDetail(error.id);
      setSelectedError(detail);
      setShowDetailModal(true);
    } catch (error: any) {
      show(`Failed to load error details: ${error.message}`, "error");
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResolving(true);
      await resolveError(selectedError.id, resolutionNote);
      show("Error marked as resolved", "success");
      setShowResolveModal(false);
      setShowDetailModal(false);
      setResolutionNote("");
      handleRefresh();
    } catch (error: any) {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show(`Failed to resolve error: ${error.message}`, "error");
    } finally {
      setResolving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return auroraTheme.colors.error[500];
      case "error":
        return auroraTheme.colors.error[500];
      case "warning":
        return auroraTheme.colors.warning[500];
      case "info":
        return auroraTheme.colors.primary[500];
      default:
        return auroraTheme.colors.text.secondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return "alert-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
      default:
        return "ellipse";
    }
  };

  const renderErrorItem = ({ item: error }: { item: ErrorLog }) => (
    <AnimatedPressable
      onPress={() => handleErrorClick(error)}
      style={{ marginBottom: auroraTheme.spacing.md }}
    >
      <GlassCard
        variant="light"
        padding={auroraTheme.spacing.md}
        borderRadius={auroraTheme.borderRadius.lg}
        style={{
          borderColor:
            error.severity === "critical"
              ? auroraTheme.colors.error[500]
              : undefined,
        }}
      >
        <View style={styles.errorHeader}>
          <View style={styles.errorHeaderLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getSeverityColor(error.severity) + "20" },
              ]}
            >
              <Ionicons
                name={getSeverityIcon(error.severity) as any}
                size={20}
                color={getSeverityColor(error.severity)}
              />
            </View>
            <View style={styles.errorInfo}>
              <Text style={styles.errorType}>{error.error_type}</Text>
              <Text style={styles.errorMessage} numberOfLines={1}>
                {error.error_message}
              </Text>
            </View>
          </View>
          <GlassCard
            variant="dark"
            intensity={10}
            padding={auroraTheme.spacing.xs}
            borderRadius={auroraTheme.borderRadius.full}
          >
            <Text
              style={[
                styles.severityText,
                { color: getSeverityColor(error.severity) },
              ]}
            >
              {error.severity.toUpperCase()}
            </Text>
          </GlassCard>
        </View>

        <View style={styles.errorMeta}>
          <View style={styles.metaRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color={auroraTheme.colors.text.tertiary}
            />
            <Text style={styles.metaText}>
              {formatTimestamp(error.timestamp)}
            </Text>
          </View>
          {error.endpoint && (
            <View style={styles.metaRow}>
              <Ionicons
                name="globe-outline"
                size={14}
                color={auroraTheme.colors.text.tertiary}
              />
              <Text style={styles.metaText}>
                {error.method} {error.endpoint}
              </Text>
            </View>
          )}
          {error.user && (
            <View style={styles.metaRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={auroraTheme.colors.text.tertiary}
              />
              <Text style={styles.metaText}>{error.user}</Text>
            </View>
          )}
        </View>

        {error.resolved && (
          <GlassCard
            variant="medium"
            padding={auroraTheme.spacing.sm}
            borderRadius={auroraTheme.borderRadius.md}
            style={styles.resolvedBadge}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={auroraTheme.colors.success[500]}
            />
            <Text style={styles.resolvedText}>
              Resolved by {error.resolved_by}
            </Text>
          </GlassCard>
        )}
      </GlassCard>
    </AnimatedPressable>
  );

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
              <Text style={styles.pageTitle}>Error Monitoring</Text>
              <Text style={styles.pageSubtitle}>
                System exceptions & failures
              </Text>
            </View>
          </View>
        </Animated.View>

        {stats && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.statsContainer}
          >
            <StatsCard
              title="Total Errors"
              value={stats.total?.toString() || "0"}
              icon="bug-outline"
              variant="primary"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Critical"
              value={`${stats.by_severity?.critical || 0}`}
              icon="alert-circle-outline"
              variant="error"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Unresolved"
              value={`${stats.unresolved || 0}`}
              icon="time-outline"
              variant="warning"
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        {/* Filters */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <AnimatedPressable
              onPress={() => setFilters({ ...filters, severity: "" })}
              style={{ marginRight: auroraTheme.spacing.sm }}
            >
              <GlassCard
                variant={filters.severity === "" ? "medium" : "light"}
                padding={8}
                borderRadius={auroraTheme.borderRadius.full}
                style={
                  filters.severity === "" && {
                    borderColor: auroraTheme.colors.primary[500],
                    borderWidth: 1,
                  }
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filters.severity === "" && {
                      color: auroraTheme.colors.primary[500],
                    },
                  ]}
                >
                  All Severities
                </Text>
              </GlassCard>
            </AnimatedPressable>
            {["critical", "error", "warning"].map((sev) => (
              <AnimatedPressable
                key={sev}
                onPress={() => setFilters({ ...filters, severity: sev })}
                style={{ marginRight: auroraTheme.spacing.sm }}
              >
                <GlassCard
                  variant={filters.severity === sev ? "medium" : "light"}
                  padding={8}
                  borderRadius={auroraTheme.borderRadius.full}
                  style={
                    filters.severity === sev && {
                      borderColor: getSeverityColor(sev),
                      borderWidth: 1,
                    }
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      filters.severity === sev && {
                        color: getSeverityColor(sev),
                      },
                    ]}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Text>
                </GlassCard>
              </AnimatedPressable>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filtersScroll,
              { marginTop: auroraTheme.spacing.sm },
            ]}
          >
            <AnimatedPressable
              onPress={() => setFilters({ ...filters, resolved: undefined })}
              style={{ marginRight: auroraTheme.spacing.sm }}
            >
              <GlassCard
                variant={filters.resolved === undefined ? "medium" : "light"}
                padding={8}
                borderRadius={auroraTheme.borderRadius.full}
                style={
                  filters.resolved === undefined && {
                    borderColor: auroraTheme.colors.primary[500],
                    borderWidth: 1,
                  }
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filters.resolved === undefined && {
                      color: auroraTheme.colors.primary[500],
                    },
                  ]}
                >
                  All Status
                </Text>
              </GlassCard>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setFilters({ ...filters, resolved: false })}
              style={{ marginRight: auroraTheme.spacing.sm }}
            >
              <GlassCard
                variant={filters.resolved === false ? "medium" : "light"}
                padding={8}
                borderRadius={auroraTheme.borderRadius.full}
                style={
                  filters.resolved === false && {
                    borderColor: auroraTheme.colors.warning[500],
                    borderWidth: 1,
                  }
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filters.resolved === false && {
                      color: auroraTheme.colors.warning[500],
                    },
                  ]}
                >
                  Unresolved
                </Text>
              </GlassCard>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setFilters({ ...filters, resolved: true })}
              style={{ marginRight: auroraTheme.spacing.sm }}
            >
              <GlassCard
                variant={filters.resolved === true ? "medium" : "light"}
                padding={8}
                borderRadius={auroraTheme.borderRadius.full}
                style={
                  filters.resolved === true && {
                    borderColor: auroraTheme.colors.success[500],
                    borderWidth: 1,
                  }
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filters.resolved === true && {
                      color: auroraTheme.colors.success[500],
                    },
                  ]}
                >
                  Resolved
                </Text>
              </GlassCard>
            </AnimatedPressable>
          </ScrollView>
        </Animated.View>

        <View style={styles.listContainer}>
          {loading && errors.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={auroraTheme.colors.primary[500]}
              />
              <Text style={styles.loadingText}>Loading error logs...</Text>
            </View>
          ) : (
            <FlashList
              data={errors}
              renderItem={renderErrorItem}
              // @ts-ignore
              estimatedItemSize={200}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={auroraTheme.colors.primary[500]}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={64}
                    color={auroraTheme.colors.success[500]}
                  />
                  <Text style={styles.emptyText}>No errors found</Text>
                </View>
              }
              ListFooterComponent={
                loading && errors.length > 0 ? (
                  <View style={{ padding: 20 }}>
                    <ActivityIndicator
                      color={auroraTheme.colors.primary[500]}
                    />
                  </View>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: auroraTheme.spacing.xl }}
            />
          )}
        </View>

        {/* Error Detail Modal */}
        <Modal
          visible={showDetailModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDetailModal(false)}
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
                <Text style={styles.modalTitle}>Error Details</Text>
                <AnimatedPressable onPress={() => setShowDetailModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={auroraTheme.colors.text.primary}
                  />
                </AnimatedPressable>
              </View>

              {selectedError && (
                <Animated.ScrollView style={styles.modalBody}>
                  <View
                    style={[
                      styles.detailBadge,
                      {
                        backgroundColor:
                          getSeverityColor(selectedError.severity) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailBadgeText,
                        { color: getSeverityColor(selectedError.severity) },
                      ]}
                    >
                      {selectedError.severity.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.detailMessage}>
                    {selectedError.error_message}
                  </Text>
                  <Text style={styles.detailType}>
                    {selectedError.error_type}
                  </Text>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Timestamp</Text>
                    <Text style={styles.detailValue}>
                      {formatTimestamp(selectedError.timestamp)}
                    </Text>
                  </View>

                  {selectedError.error_code && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Error Code</Text>
                      <Text style={styles.detailValue}>
                        {selectedError.error_code}
                      </Text>
                    </View>
                  )}

                  {selectedError.endpoint && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Endpoint</Text>
                      <Text style={styles.detailValue}>
                        {selectedError.method} {selectedError.endpoint}
                      </Text>
                    </View>
                  )}

                  {selectedError.stack_trace && (
                    <View style={styles.stackTraceContainer}>
                      <Text style={styles.stackTraceLabel}>Stack Trace</Text>
                      <GlassCard
                        variant="dark"
                        padding={auroraTheme.spacing.sm}
                        borderRadius={auroraTheme.borderRadius.md}
                      >
                        <Text style={styles.stackTraceText}>
                          {selectedError.stack_trace}
                        </Text>
                      </GlassCard>
                    </View>
                  )}

                  {selectedError.resolved && selectedError.resolution_note && (
                    <View style={styles.resolutionContainer}>
                      <Text style={styles.resolutionLabel}>Resolution</Text>
                      <GlassCard
                        variant="medium"
                        padding={auroraTheme.spacing.md}
                        borderRadius={auroraTheme.borderRadius.md}
                        style={{ borderColor: auroraTheme.colors.success[500] }}
                      >
                        <Text style={styles.resolutionText}>
                          {selectedError.resolution_note}
                        </Text>
                        <View style={styles.resolverInfo}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={auroraTheme.colors.success[500]}
                          />
                          <Text style={styles.resolverText}>
                            Resolved by {selectedError.resolved_by}
                          </Text>
                        </View>
                      </GlassCard>
                    </View>
                  )}
                </Animated.ScrollView>
              )}

              <View style={styles.modalFooter}>
                {selectedError && !selectedError.resolved && (
                  <AnimatedPressable
                    style={[
                      styles.resolveButton,
                      { backgroundColor: auroraTheme.colors.success[500] },
                    ]}
                    onPress={() => {
                      setShowDetailModal(false);
                      setShowResolveModal(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.resolveButtonText}>
                      Mark as Resolved
                    </Text>
                  </AnimatedPressable>
                )}
              </View>
            </GlassCard>
          </AuroraBackground>
        </Modal>

        {/* Resolve Modal */}
        <Modal
          visible={showResolveModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowResolveModal(false)}
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
                <Text style={styles.modalTitle}>Resolve Error</Text>
                <AnimatedPressable onPress={() => setShowResolveModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={auroraTheme.colors.text.primary}
                  />
                </AnimatedPressable>
              </View>

              <View style={styles.resolveBody}>
                <Text style={styles.inputLabel}>
                  Resolution Note (Optional)
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Describe how this was resolved..."
                  placeholderTextColor={auroraTheme.colors.text.tertiary}
                  value={resolutionNote}
                  onChangeText={setResolutionNote}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <AnimatedPressable
                style={[
                  styles.resolveButton,
                  {
                    backgroundColor: auroraTheme.colors.success[500],
                    marginTop: auroraTheme.spacing.lg,
                  },
                ]}
                onPress={handleResolve}
                disabled={resolving}
              >
                {resolving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.resolveButtonText}>
                      Confirm Resolution
                    </Text>
                  </>
                )}
              </AnimatedPressable>
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
  statsContainer: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
    marginBottom: auroraTheme.spacing.md,
  },
  filtersContainer: {
    marginBottom: auroraTheme.spacing.md,
  },
  filtersScroll: {
    paddingBottom: 4,
  },
  filterText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: auroraTheme.spacing.md,
    color: auroraTheme.colors.text.secondary,
    fontSize: auroraTheme.typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    marginTop: auroraTheme.spacing.md,
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.lg,
  },
  errorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.sm,
  },
  errorHeaderLeft: {
    flexDirection: "row",
    flex: 1,
    gap: auroraTheme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: auroraTheme.borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  errorInfo: {
    flex: 1,
  },
  errorType: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
  },
  errorMessage: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  severityText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: "bold",
  },
  errorMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: auroraTheme.spacing.xs,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: auroraTheme.colors.success[500],
  },
  resolvedText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.success[500],
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
    maxWidth: 600,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.lg,
  },
  modalTitle: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  modalBody: {
    marginBottom: auroraTheme.spacing.lg,
  },
  detailBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.full,
    marginBottom: auroraTheme.spacing.sm,
  },
  detailBadgeText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: "bold",
  },
  detailMessage: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  },
  detailType: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.tertiary,
    marginBottom: auroraTheme.spacing.lg,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  separator: {
    height: 1,
    backgroundColor: auroraTheme.colors.border.light,
    marginBottom: auroraTheme.spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: auroraTheme.spacing.md,
  },
  detailLabel: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.sm,
  },
  detailValue: {
    color: auroraTheme.colors.text.primary,
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "600",
  },
  stackTraceContainer: {
    marginTop: auroraTheme.spacing.md,
  },
  stackTraceLabel: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.sm,
    marginBottom: 8,
  },
  stackTraceText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: auroraTheme.typography.fontSize.xs,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  resolutionContainer: {
    marginTop: auroraTheme.spacing.lg,
  },
  resolutionLabel: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.sm,
    marginBottom: 8,
  },
  resolutionText: {
    color: auroraTheme.colors.text.primary,
    fontSize: auroraTheme.typography.fontSize.sm,
    marginBottom: 8,
  },
  resolverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resolverText: {
    color: auroraTheme.colors.success[500],
    fontSize: auroraTheme.typography.fontSize.xs,
  },
  modalFooter: {
    marginTop: auroraTheme.spacing.lg,
  },
  resolveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: auroraTheme.borderRadius.full,
  },
  resolveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: auroraTheme.typography.fontSize.md,
  },
  resolveBody: {},
  inputLabel: {
    color: auroraTheme.colors.text.secondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: auroraTheme.colors.text.primary,
    padding: 12,
    borderRadius: auroraTheme.borderRadius.md,
    fontSize: auroraTheme.typography.fontSize.md,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
});
