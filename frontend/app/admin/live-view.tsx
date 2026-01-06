import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenContainer } from "@/components/ui";
import { auroraTheme } from "@/theme/auroraTheme";
import { ItemVerificationAPI } from "@/domains/inventory/services/itemVerificationApi";
import api from "@/services/httpClient";

type ActiveSession = {
  id: string;
  warehouse?: string;
  status?: string;
  type?: string;
  staff_user?: string;
  staff_name?: string;
  started_at?: string;
  total_items?: number;
  total_variance?: number;
};

const formatTimeAgo = (iso?: string | null) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

export default function AdminLiveView() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyVariance, setOnlyVariance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [liveUsers, setLiveUsers] = useState<
    Awaited<ReturnType<typeof ItemVerificationAPI.getLiveUsers>>["users"]
  >([]);
  const [liveVerifications, setLiveVerifications] = useState<
    Awaited<
      ReturnType<typeof ItemVerificationAPI.getLiveVerifications>
    >["verifications"]
  >([]);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);

      const [sessionsRes, usersRes, verificationsRes] =
        await Promise.allSettled([
          api.get("/api/sessions/active"),
          ItemVerificationAPI.getLiveUsers(),
          ItemVerificationAPI.getLiveVerifications(50),
        ]);

      if (sessionsRes.status === "fulfilled") {
        const data = sessionsRes.value.data;
        const sessions = Array.isArray(data)
          ? data
          : Array.isArray(data?.sessions)
            ? data.sessions
            : [];
        setActiveSessions(sessions);
      }

      if (usersRes.status === "fulfilled") {
        setLiveUsers(usersRes.value.users || []);
      }

      if (verificationsRes.status === "fulfilled") {
        setLiveVerifications(verificationsRes.value.verifications || []);
      }

      const firstReject =
        sessionsRes.status === "rejected"
          ? sessionsRes.reason
          : usersRes.status === "rejected"
            ? usersRes.reason
            : verificationsRes.status === "rejected"
              ? verificationsRes.reason
              : null;

      if (firstReject) {
        setError(
          firstReject instanceof Error
            ? firstReject.message
            : "Some live data failed to load",
        );
      }

      setLastUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load live data");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();

      if (autoRefresh) {
        intervalRef.current = setInterval(fetchAll, 8000);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [autoRefresh, fetchAll]),
  );

  const filteredVerifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liveVerifications
      .filter((v) => (onlyVariance ? Boolean(v.variance) : true))
      .filter((v) => {
        if (!q) return true;
        return (
          v.item_code?.toLowerCase().includes(q) ||
          v.item_name?.toLowerCase().includes(q) ||
          v.verified_by?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q) ||
          v.floor?.toLowerCase().includes(q) ||
          v.rack?.toLowerCase().includes(q)
        );
      });
  }, [liveVerifications, onlyVariance, searchQuery]);

  return (
    <ScreenContainer
      gradient
      header={{
        title: "Live View",
        subtitle: lastUpdatedAt
          ? `Updated ${formatTimeAgo(lastUpdatedAt.toISOString())}`
          : "Loading…",
        showBackButton: true,
      }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.topRow}>
          <GlassCard style={styles.kpiCard} variant="strong" elevation="md">
            <View style={styles.kpiHeader}>
              <Ionicons
                name="radio"
                size={18}
                color={auroraTheme.colors.primary[400]}
              />
              <Text style={styles.kpiLabel}>Active Sessions</Text>
            </View>
            <Text style={styles.kpiValue}>{activeSessions.length}</Text>
            <Text style={styles.kpiHint}>
              {activeSessions[0]?.warehouse
                ? `Latest: ${activeSessions[0].warehouse}`
                : "Pull to refresh"}
            </Text>
          </GlassCard>

          <GlassCard style={styles.kpiCard} variant="strong" elevation="md">
            <View style={styles.kpiHeader}>
              <Ionicons
                name="people"
                size={18}
                color={auroraTheme.colors.primary[400]}
              />
              <Text style={styles.kpiLabel}>Live Users</Text>
            </View>
            <Text style={styles.kpiValue}>{liveUsers.length}</Text>
            <Text style={styles.kpiHint}>Last 1 hour</Text>
          </GlassCard>

          <GlassCard style={styles.kpiCard} variant="strong" elevation="md">
            <View style={styles.kpiHeader}>
              <Ionicons
                name="checkmark-done"
                size={18}
                color={auroraTheme.colors.primary[400]}
              />
              <Text style={styles.kpiLabel}>Verifications</Text>
            </View>
            <Text style={styles.kpiValue}>{liveVerifications.length}</Text>
            <Text style={styles.kpiHint}>Most recent 50</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.controlsCard} variant="medium" elevation="sm">
          <View style={styles.controlsRow}>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={16}
                color={auroraTheme.colors.text.secondary}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Filter by item/user/category…"
                placeholderTextColor={auroraTheme.colors.text.tertiary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={auroraTheme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, autoRefresh && styles.toggleBtnActive]}
              onPress={() => setAutoRefresh((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Toggle auto refresh"
            >
              <Ionicons
                name={autoRefresh ? "sync" : "sync-outline"}
                size={16}
                color={
                  autoRefresh
                    ? auroraTheme.colors.primary[300]
                    : auroraTheme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.toggleText,
                  autoRefresh && styles.toggleTextActive,
                ]}
              >
                Auto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, onlyVariance && styles.toggleBtnActive]}
              onPress={() => setOnlyVariance((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Toggle only variance"
            >
              <Ionicons
                name="warning"
                size={16}
                color={
                  onlyVariance
                    ? auroraTheme.colors.warning[400]
                    : auroraTheme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.toggleText,
                  onlyVariance && styles.toggleTextActive,
                ]}
              >
                Variance
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorRow}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={auroraTheme.colors.error[400]}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </GlassCard>

        <View style={styles.grid}>
          <GlassCard style={styles.panel} variant="medium" elevation="sm">
            <Text style={styles.panelTitle}>Live Users</Text>
            {liveUsers.length === 0 ? (
              <Text style={styles.emptyText}>No active users detected.</Text>
            ) : (
              liveUsers.map((u) => (
                <View key={u.username} style={styles.userRow}>
                  <View style={styles.userLeft}>
                    <View style={styles.userDot} />
                    <Text style={styles.userName}>{u.username}</Text>
                  </View>
                  <View style={styles.userRight}>
                    <Text style={styles.userMeta}>
                      {u.items_verified} items
                    </Text>
                    <Text style={styles.userMeta}>
                      {formatTimeAgo(u.last_activity)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </GlassCard>

          <GlassCard style={styles.panel} variant="medium" elevation="sm">
            <Text style={styles.panelTitle}>Recent Verifications</Text>
            {filteredVerifications.length === 0 ? (
              <Text style={styles.emptyText}>No matching records.</Text>
            ) : (
              filteredVerifications.map((v, idx) => {
                const variance = Number(v.variance || 0);
                const hasVariance = variance !== 0;
                return (
                  <View
                    key={`${v.item_code}-${v.verified_at}-${idx}`}
                    style={styles.verRow}
                  >
                    <View style={styles.verMain}>
                      <Text style={styles.verTitle} numberOfLines={1}>
                        {v.item_name || v.item_code}
                      </Text>
                      <Text style={styles.verSub} numberOfLines={1}>
                        {v.item_code} • {v.verified_by || "unknown"} •{" "}
                        {formatTimeAgo(v.verified_at)}
                      </Text>
                      <Text style={styles.verSub} numberOfLines={1}>
                        {(v.category || "—") +
                          (v.floor ? ` • ${v.floor}` : "") +
                          (v.rack ? ` • ${v.rack}` : "")}
                      </Text>
                    </View>
                    {hasVariance && (
                      <View style={styles.variancePill}>
                        <Text style={styles.varianceText}>
                          {variance > 0 ? "+" : ""}
                          {variance}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </GlassCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: auroraTheme.spacing.md,
    paddingBottom: 32,
    gap: auroraTheme.spacing.md,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    padding: auroraTheme.spacing.md,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  kpiLabel: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  kpiValue: {
    color: auroraTheme.colors.text.primary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  kpiHint: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: 12,
  },
  controlsCard: {
    padding: auroraTheme.spacing.md,
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  searchWrap: {
    flex: 1,
    minWidth: 240,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: auroraTheme.borderRadius.md,
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: {
    flex: 1,
    color: auroraTheme.colors.text.primary,
    fontSize: 14,
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: auroraTheme.borderRadius.md,
    backgroundColor: auroraTheme.colors.surface.base,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toggleBtnActive: {
    borderColor: auroraTheme.colors.primary[400],
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  toggleText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: auroraTheme.colors.text.primary,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  errorText: {
    color: auroraTheme.colors.text.secondary,
    fontSize: 12,
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
  },
  panel: {
    flex: 1,
    minWidth: 320,
    padding: auroraTheme.spacing.md,
  },
  panelTitle: {
    color: auroraTheme.colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyText: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  userName: {
    color: auroraTheme.colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  userRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  userMeta: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: 12,
  },
  verRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  verMain: {
    flex: 1,
    gap: 2,
  },
  verTitle: {
    color: auroraTheme.colors.text.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  verSub: {
    color: auroraTheme.colors.text.tertiary,
    fontSize: 12,
  },
  variancePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 152, 0, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.28)",
  },
  varianceText: {
    color: auroraTheme.colors.text.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
