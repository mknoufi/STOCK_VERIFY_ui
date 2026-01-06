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
import {
  GlassCard,
  AnimatedPressable,
  ScreenContainer,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";
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
        return theme.colors.warning.main;
      case "CLOSED":
        return theme.colors.success.main;
      case "RECONCILE":
        return theme.colors.secondary[500];
      default:
        return theme.colors.text.secondary;
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const statusColor = getStatusColor(item.status);
    const hasVariance = Math.abs(item.total_variance || 0) > 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <AnimatedPressable
          onPress={() => router.push(`/supervisor/session/${item.id}` as any)}
          style={{ marginBottom: theme.spacing.md }}
        >
          <GlassCard
            variant="medium"
            padding={theme.spacing.md}
            borderRadius={theme.borderRadius.lg}
            intensity={20}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.titleRow}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={theme.colors.primary[500]}
                  />
                  <Text style={styles.warehouseName}>{item.warehouse}</Text>
                </View>
                <View style={styles.staffContainer}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={theme.colors.text.secondary}
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
                  color={theme.colors.text.secondary}
                />
                <Text style={styles.statText}>{item.total_items} Items</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="analytics-outline"
                  size={16}
                  color={
                    hasVariance
                      ? theme.colors.error.main
                      : theme.colors.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.statText,
                    hasVariance && {
                      color: theme.colors.error.main,
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
        padding={theme.spacing.xl}
        intensity={15}
      >
        <Ionicons
          name="cube-outline"
          size={64}
          color={theme.colors.text.secondary}
          style={{ opacity: 0.5 }}
        />
        <Text style={styles.emptyText}>No sessions found</Text>
      </GlassCard>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={theme.colors.primary[500]} />
      </View>
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
              color={theme.colors.primary[500]}
            />
          </AnimatedPressable>
        </Animated.View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary[500]}
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
                  tintColor={theme.colors.primary[500]}
                />
              }
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={renderFooter}
              contentContainerStyle={styles.listContent}
            />
          </View>
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  pageTitle: {
    fontSize: 32,
    color: theme.colors.text.primary,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: theme.borderRadius.full,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
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
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  staffContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  staffName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: 24,
    color: theme.colors.text.secondary,
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
});
