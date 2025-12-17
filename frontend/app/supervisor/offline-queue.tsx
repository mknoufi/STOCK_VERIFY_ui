/**
 * Offline Queue Screen
 * Manage offline actions and conflicts
 * Refactored to use Aurora Design System
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";

import { flags } from "../../src/constants/flags";
import {
  flushOfflineQueue,
  getConflicts,
  resolveConflict,
  listQueue,
} from "../../src/services/offline/offlineQueue";
import api from "../../src/services/httpClient";
import { AuroraBackground, GlassCard, AnimatedPressable, StatsCard } from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

export default function OfflineQueueScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [queue, setQueue] = React.useState<any[]>([]);
  const [conflicts, setConflicts] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    if (!flags.enableOfflineQueue) return;
    setLoading(true);
    try {
      const [q, c] = await Promise.all([listQueue(), getConflicts()]);
      setQueue(q);
      setConflicts(c);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleFlush = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await flushOfflineQueue(api);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Offline queue synced successfully");
      load();
    } catch (error: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Sync Failed",
        error?.message || "Failed to sync offline queue. Please check your connection and try again."
      );
    }
  };

  const handleDismiss = async (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    await resolveConflict(id);
    load();
  };

  const renderQueueItem = ({ item }: { item: any }) => (
    <AnimatedPressable style={{ marginBottom: auroraTheme.spacing.md }}>
      <GlassCard variant="light" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.lg}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.methodBadge,
            { backgroundColor: item.method === 'post' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)' }
          ]}>
            <Text style={[
              styles.methodText,
              { color: item.method === 'post' ? auroraTheme.colors.success[400] : auroraTheme.colors.primary[400] }
            ]}>
              {String(item.method).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        <Text style={styles.cardUrl}>{item.url}</Text>

        {item.data && (
          <GlassCard variant="dark" padding={auroraTheme.spacing.sm} borderRadius={auroraTheme.borderRadius.sm} style={{ marginTop: auroraTheme.spacing.sm }}>
            <Text style={styles.cardCode} numberOfLines={2}>
              {JSON.stringify(item.data)}
            </Text>
          </GlassCard>
        )}
      </GlassCard>
    </AnimatedPressable>
  );

  const renderConflictItem = ({ item }: { item: any }) => (
    <AnimatedPressable style={{ marginBottom: auroraTheme.spacing.md }}>
      <GlassCard variant="medium" padding={auroraTheme.spacing.md} borderRadius={auroraTheme.borderRadius.lg} style={{ borderColor: auroraTheme.colors.error[500] }}>
        <View style={styles.cardHeader}>
          <View style={styles.errorBadge}>
            <Ionicons name="warning" size={12} color={auroraTheme.colors.warning[500]} />
            <Text style={styles.errorBadgeText}>Conflict</Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp || item.createdAt).toLocaleString()}
          </Text>
        </View>

        <Text style={styles.cardTitle}>
          {String(item.method).toUpperCase()} {item.url}
        </Text>

        <GlassCard variant="dark" padding={auroraTheme.spacing.sm} borderRadius={auroraTheme.borderRadius.sm} style={{ marginTop: auroraTheme.spacing.sm }}>
          <Text style={styles.cardCode} numberOfLines={4}>
            {typeof item.detail === "string"
              ? item.detail
              : JSON.stringify(item.detail)}
          </Text>
        </GlassCard>

        <View style={styles.cardActions}>
          <AnimatedPressable
            onPress={() => handleDismiss(item.id)}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </AnimatedPressable>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );

  if (!flags.enableOfflineQueue) {
    return (
      <AuroraBackground>
        <StatusBar style="light" />
        <View style={styles.center}>
          <GlassCard padding={auroraTheme.spacing.xl}>
            <Ionicons name="cloud-offline-outline" size={48} color={auroraTheme.colors.text.tertiary} style={{ alignSelf: 'center', marginBottom: auroraTheme.spacing.md }} />
            <Text style={styles.muted}>Offline Queue is disabled in flags.</Text>
          </GlassCard>
        </View>
      </AuroraBackground>
    );
  }

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
              <Text style={styles.pageTitle}>Offline Queue</Text>
              <Text style={styles.pageSubtitle}>Pending actions & conflicts</Text>
            </View>
          </View>
          <AnimatedPressable onPress={handleFlush} style={styles.flushButton}>
            <Ionicons name="sync" size={20} color="white" />
            <Text style={styles.flushText}>Flush Queue</Text>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
          <StatsCard
            title="Pending Actions"
            value={queue.length.toString()}
            icon="layers-outline"
            variant="primary"
            style={{ flex: 1 }}
          />
          <StatsCard
            title="Conflicts"
            value={conflicts.length.toString()}
            icon="alert-circle-outline"
            variant={conflicts.length > 0 ? "error" : "success"}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <View style={styles.contentContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Queue</Text>
          </View>

          <View style={{ flex: 1 }}>
            <FlashList
              data={queue}
              renderItem={renderQueueItem}
              // @ts-ignore
              estimatedItemSize={100}
              keyExtractor={(item) => item.id || `q-${Math.random()}`}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={load} tintColor={auroraTheme.colors.primary[500]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No pending actions</Text>
                </View>
              }
            />
          </View>

          <View style={[styles.sectionHeader, { marginTop: auroraTheme.spacing.lg }]}>
            <Text style={styles.sectionTitle}>Conflicts</Text>
          </View>

          <View style={{ flex: 1 }}>
            <FlashList
              data={conflicts}
              renderItem={renderConflictItem}
              // @ts-ignore
              estimatedItemSize={150}
              keyExtractor={(item) => item.id || `c-${Math.random()}`}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No conflicts resolved</Text>
                </View>
              }
            />
          </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: auroraTheme.spacing.md
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
  flushButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: auroraTheme.colors.primary[500],
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: 8,
    borderRadius: auroraTheme.borderRadius.full,
  },
  flushText: {
    color: 'white',
    fontWeight: '600',
    fontSize: auroraTheme.typography.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.lg,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: auroraTheme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: auroraTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: '700',
    color: auroraTheme.colors.text.primary,
  },
  muted: { color: auroraTheme.colors.text.tertiary, textAlign: 'center' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: auroraTheme.spacing.sm,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  methodText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  cardUrl: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: '600',
    color: auroraTheme.colors.text.primary,
  },
  cardCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: auroraTheme.borderRadius.full,
  },
  errorBadgeText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.warning[500],
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: '700',
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: auroraTheme.spacing.md,
  },
  dismissButton: {
    backgroundColor: auroraTheme.colors.background.glass,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: 6,
    borderRadius: auroraTheme.borderRadius.full,
  },
  dismissText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.primary,
    fontWeight: '600',
  },
  emptyState: {
    padding: auroraTheme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: auroraTheme.typography.fontSize.sm,
  },
});
