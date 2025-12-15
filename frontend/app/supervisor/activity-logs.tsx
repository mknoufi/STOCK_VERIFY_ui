/**
 * Activity Logs Screen - View application activity and audit logs
 * Refactored to use Aurora Design System
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";

import { getActivityLogs, getActivityStats } from "../../src/services/api/api";
import { useToast } from "../../src/components/feedback/ToastProvider";
import { AuroraBackground, GlassCard, StatsCard, AnimatedPressable } from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details: any;
  status: string;
  error_message?: string;
}

export default function ActivityLogsScreen() {
  const router = useRouter();
  const { show } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadLogs = React.useCallback(
    async (pageNum: number = 1) => {
      try {
        setLoading(pageNum === 1);
        const response = await getActivityLogs(pageNum, 20);
        if (pageNum === 1) {
          setLogs(response.activities || []);
        } else {
          setLogs((prevLogs) => [...prevLogs, ...(response.activities || [])]);
        }
        setHasMore(response.pagination?.has_next || false);
      } catch (error: any) {
        show(`Failed to load logs: ${error.message}`, "error");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [show],
  );

  const loadStats = React.useCallback(async () => {
    try {
      const statsData = await getActivityStats();
      setStats(statsData);
    } catch (error: any) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  const handleRefresh = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setPage(1);
    loadLogs(1);
    loadStats();
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      const nextPage = page + 1;
      setPage(nextPage);
      loadLogs(nextPage);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      login: "log-in-outline",
      logout: "log-out-outline",
      scan_item: "barcode-outline",
      create_session: "add-circle-outline",
      approve_count: "checkmark-circle-outline",
      reject_count: "close-circle-outline",
      refresh_stock: "refresh-outline",
      sync: "sync-outline",
    };
    return iconMap[action] || "ellipse-outline";
  };

  const renderLogItem = ({ item: log }: { item: ActivityLog }) => (
    <AnimatedPressable style={{ marginBottom: auroraTheme.spacing.md }}>
      <GlassCard variant="light" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.lg}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: log.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons
                name={getActionIcon(log.action) as any}
                size={20}
                color={log.status === 'error' ? auroraTheme.colors.error[500] : auroraTheme.colors.primary[500]}
              />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logAction}>
                {log.action.replace(/_/g, " ").toUpperCase()}
              </Text>
              <Text style={styles.logUser}>
                {log.user} • {log.role}
              </Text>
            </View>
          </View>
          <Text style={[styles.statusText, {
            color: log.status === 'success' ? auroraTheme.colors.success[500] :
              log.status === 'error' ? auroraTheme.colors.error[500] :
                auroraTheme.colors.warning[500]
          }]}>
            {log.status}
          </Text>
        </View>

        <Text style={styles.timestamp}>
          {formatTimestamp(log.timestamp)}
        </Text>

        {log.entity_type && (
          <GlassCard variant="dark" padding={auroraTheme.spacing.xs} borderRadius={auroraTheme.borderRadius.sm} style={{ alignSelf: 'flex-start', marginVertical: auroraTheme.spacing.xs }}>
            <Text style={styles.entityText}>
              {log.entity_type}: {log.entity_id || "N/A"}
            </Text>
          </GlassCard>
        )}

        {log.error_message && (
          <GlassCard
            variant="medium"
            padding={auroraTheme.spacing.sm}
            borderRadius={auroraTheme.borderRadius.md}
            style={{
              marginTop: auroraTheme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderColor: auroraTheme.colors.error[500],
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }}
          >
            <Ionicons name="alert-circle" size={16} color={auroraTheme.colors.error[500]} />
            <Text style={[styles.errorText, { color: auroraTheme.colors.error[500] }]}>{log.error_message}</Text>
          </GlassCard>
        )}

        {Object.keys(log.details || {}).length > 0 && !log.error_message && (
          <GlassCard variant="dark" padding={auroraTheme.spacing.sm} borderRadius={auroraTheme.borderRadius.md} style={{ marginTop: auroraTheme.spacing.sm }}>
            <Text style={styles.detailsText} numberOfLines={3}>
              {JSON.stringify(log.details, null, 2)}
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
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={auroraTheme.colors.text.primary} />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Activity Logs</Text>
              <Text style={styles.pageSubtitle}>System audit & user actions</Text>
            </View>
          </View>
        </Animated.View>

        {stats && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsContainer}>
            <StatsCard
              title="Total Activities"
              value={stats.total?.toString() || "0"}
              icon="layers-outline"
              variant="primary"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Success Rate"
              value={`${stats.by_status?.success || 0}`}
              icon="checkmark-circle-outline"
              variant="success"
              style={{ flex: 1 }}
            />
            <StatsCard
              title="Errors"
              value={`${stats.by_status?.error || 0}`}
              icon="alert-circle-outline"
              variant="error"
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        <View style={styles.listContainer}>
          {loading && logs.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={auroraTheme.colors.primary[500]} />
              <Text style={styles.loadingText}>Loading activity logs...</Text>
            </View>
          ) : (
            <FlashList
              data={logs}
              renderItem={renderLogItem}
              // @ts-ignore
              estimatedItemSize={180}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={auroraTheme.colors.primary[500]} />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={64} color={auroraTheme.colors.text.tertiary} />
                  <Text style={styles.emptyText}>No activity logs found</Text>
                </View>
              }
              ListFooterComponent={
                loading && logs.length > 0 ? (
                  <View style={{ padding: 20 }}>
                    <ActivityIndicator color={auroraTheme.colors.primary[500]} />
                  </View>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: auroraTheme.spacing.xl }}
            />
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
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
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: auroraTheme.spacing.md,
    color: auroraTheme.colors.text.secondary,
    fontSize: auroraTheme.typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: auroraTheme.spacing.md,
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.lg,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: auroraTheme.spacing.sm,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    gap: auroraTheme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: auroraTheme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: '700',
    color: auroraTheme.colors.text.primary,
    marginBottom: 2,
  },
  logUser: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  statusText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
    marginBottom: auroraTheme.spacing.xs,
    marginLeft: 52, // Align with text, skipping icon
  },
  entityText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    flex: 1,
  },
  detailsText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
