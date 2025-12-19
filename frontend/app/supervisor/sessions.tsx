/**
 * Sessions List Screen
 * Displays a paginated list of all stock verification sessions.
 * Refactored to use Aurora Design System
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { getSessions } from "../../src/services/api/api";
import { AuroraBackground } from "../../src/components/ui/AuroraBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import { AnimatedPressable } from "../../src/components/ui/AnimatedPressable";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useToast } from "../../src/components/feedback/ToastProvider";

export default function SessionsList() {
  const router = useRouter();
  const { show } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSessions = useCallback(
    async (pageNum: number, shouldRefresh = false) => {
      try {
        if (pageNum === 1) setLoading(true);

        const response = await getSessions(pageNum, 20);
        const newSessions = response.items || [];
        const pagination = response.pagination;

        if (shouldRefresh) {
          setSessions(newSessions);
        } else {
          setSessions((prev) => [...prev, ...newSessions]);
        }

        setHasMore(pagination.has_next);
      } catch (error) {
        console.error("Failed to load sessions:", error);
        show("Failed to load sessions", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [show],
  );

  useEffect(() => {
    loadSessions(1, true);
  }, [loadSessions]);

  const handleRefresh = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setPage(1);
    loadSessions(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      loadSessions(nextPage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return auroraTheme.colors.warning[500];
      case "CLOSED":
        return auroraTheme.colors.success[500];
      case "RECONCILE":
        return auroraTheme.colors.secondary[500];
      default:
        return auroraTheme.colors.text.tertiary;
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const statusColor = getStatusColor(item.status);
    const hasVariance = Math.abs(item.total_variance || 0) > 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <AnimatedPressable
          onPress={() => router.push(`/supervisor/session/${item.id}` as any)}
          style={{ marginBottom: auroraTheme.spacing.md }}
        >
          <GlassCard
            variant="medium"
            padding={auroraTheme.spacing.md}
            borderRadius={auroraTheme.borderRadius.lg}
            elevation="sm"
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.titleRow}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={auroraTheme.colors.primary[500]}
                  />
                  <Text style={styles.warehouseName}>{item.warehouse}</Text>
                </View>
                <View style={styles.staffContainer}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={auroraTheme.colors.text.secondary}
                  />
                  <Text style={styles.staffName}>
                    {item.staff_name || "Unknown Staff"}
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
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.statItem}>
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={auroraTheme.colors.text.secondary}
                />
                <Text style={styles.statText}>{item.total_items} Items</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="analytics-outline"
                  size={16}
                  color={
                    hasVariance
                      ? auroraTheme.colors.error[500]
                      : auroraTheme.colors.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.statText,
                    hasVariance && {
                      color: auroraTheme.colors.error[500],
                      fontWeight: "600",
                    },
                  ]}
                >
                  Var: {item.total_variance?.toFixed(2) || "0.00"}
                </Text>
              </View>

              <View style={[styles.statItem, { marginLeft: "auto" }]}>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </GlassCard>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <GlassCard
        variant="medium"
        style={styles.emptyCard}
        padding={auroraTheme.spacing.xl}
      >
        <Ionicons
          name="cube-outline"
          size={64}
          color={auroraTheme.colors.text.tertiary}
        />
        <Text style={styles.emptyText}>No sessions found</Text>
      </GlassCard>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={auroraTheme.colors.primary[500]} />
      </View>
    );
  };

  return (
    <AuroraBackground variant="secondary" intensity="low">
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
              <Text style={styles.pageTitle}>All Sessions</Text>
              <Text style={styles.pageSubtitle}>
                Stock Verification History
              </Text>
            </View>
          </View>
          <AnimatedPressable
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={auroraTheme.colors.primary[500]}
            />
          </AnimatedPressable>
        </Animated.View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color={auroraTheme.colors.primary[500]}
            />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <FlashList
              data={sessions}
              renderItem={renderItem}
              // @ts-ignore
              estimatedItemSize={140}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={auroraTheme.colors.primary[500]}
                />
              }
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={renderFooter}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}
      </View>
    </AuroraBackground>
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
    paddingHorizontal: auroraTheme.spacing.md,
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
  refreshButton: {
    padding: auroraTheme.spacing.sm,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.full,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: auroraTheme.spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warehouseName: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.bold,
    color: auroraTheme.colors.text.primary,
  },
  staffContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  staffName: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.badge,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.lg,
    paddingTop: auroraTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.light,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  dateText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  emptyContainer: {
    padding: auroraTheme.spacing.xl,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: auroraTheme.spacing.md,
  },
  emptyText: {
    fontSize: auroraTheme.typography.fontSize.xl,
    color: auroraTheme.colors.text.secondary,
    fontWeight: "bold",
  },
  footerLoader: {
    paddingVertical: auroraTheme.spacing.md,
    alignItems: "center",
  },
});
