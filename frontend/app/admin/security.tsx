import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  LoadingSpinner,
  ScreenHeader,
  AuroraBackground,
  AnimatedPressable,
} from "../../src/components/ui";
import {
  getSecuritySummary,
  getFailedLogins,
  getSuspiciousActivity,
  getSecuritySessions,
  getSecurityAuditLog,
  getIpTracking,
} from "../../src/services/api";
import { auroraTheme } from "../../src/theme/auroraTheme";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

export default function SecurityScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [ipTracking, setIpTracking] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "summary" | "failed" | "suspicious" | "sessions" | "audit" | "ips"
  >("summary");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to view the security dashboard.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        summaryRes,
        failedRes,
        suspiciousRes,
        sessionsRes,
        auditRes,
        ipRes,
      ] = await Promise.all([
        getSecuritySummary().catch(() => ({ success: false, data: null })),
        getFailedLogins(50, 24).catch(() => ({
          success: false,
          data: { failed_logins: [] },
        })),
        getSuspiciousActivity(24).catch(() => ({ success: false, data: null })),
        getSecuritySessions(50, false).catch(() => ({
          success: false,
          data: { sessions: [] },
        })),
        getSecurityAuditLog(50, 24).catch(() => ({
          success: false,
          data: { audit_logs: [] },
        })),
        getIpTracking(24).catch(() => ({
          success: false,
          data: { ip_tracking: [] },
        })),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (failedRes.success)
        setFailedLogins(failedRes.data?.failed_logins || []);
      if (suspiciousRes.success) setSuspiciousActivity(suspiciousRes.data);
      if (sessionsRes.success) setSessions(sessionsRes.data?.sessions || []);
      if (auditRes.success) setAuditLog(auditRes.data?.audit_logs || []);
      if (ipRes.success) setIpTracking(ipRes.data?.ip_tracking || []);

      setLastUpdate(new Date());
    } catch (error: any) {
      if (!isRefresh) {
        Alert.alert("Error", error.message || "Failed to load security data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  const renderSummary = () => {
    if (!summary) return null;

    const stats = summary.summary || {};

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Security Overview</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="close-circle" size={32} color="#f44336" />
            <Text style={styles.metricValue}>{stats.failed_logins || 0}</Text>
            <Text style={styles.metricLabel}>Failed Logins</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.metricValue}>
              {stats.successful_logins || 0}
            </Text>
            <Text style={styles.metricLabel}>Successful Logins</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="people" size={32} color="#007AFF" />
            <Text style={styles.metricValue}>{stats.active_sessions || 0}</Text>
            <Text style={styles.metricLabel}>Active Sessions</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="warning" size={32} color="#FF9800" />
            <Text style={styles.metricValue}>{stats.suspicious_ips || 0}</Text>
            <Text style={styles.metricLabel}>Suspicious IPs</Text>
          </View>
        </View>

        {summary.recent_events && summary.recent_events.length > 0 && (
          <View style={styles.recentEvents}>
            <Text style={styles.subsectionTitle}>Recent Security Events</Text>
            {summary.recent_events.map((event: any, index: number) => (
              <View key={index} style={styles.eventRow}>
                <Ionicons
                  name={
                    event.action === "login"
                      ? "log-in"
                      : event.action === "logout"
                        ? "log-out"
                        : "shield"
                  }
                  size={20}
                  color="#007AFF"
                />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventAction}>{event.action}</Text>
                  <Text style={styles.eventUser}>
                    {event.user} • {new Date(event.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFailedLogins = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="close-circle" size={24} color="#f44336" />
        <Text style={styles.sectionTitle}>Failed Login Attempts</Text>
      </View>
      {failedLogins.length === 0 ? (
        <Text style={styles.emptyText}>
          No failed login attempts in the last 24 hours
        </Text>
      ) : (
        <View style={styles.listContainer}>
          {failedLogins.map((login: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="close-circle" size={20} color="#f44336" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>
                  {login.username || "Unknown"}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {login.ip_address} • {login.error || "Login failed"} •{" "}
                  {new Date(login.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSuspiciousActivity = () => {
    if (!suspiciousActivity) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={24} color="#FF9800" />
          <Text style={styles.sectionTitle}>Suspicious Activity</Text>
        </View>

        {suspiciousActivity.suspicious_ips &&
          suspiciousActivity.suspicious_ips.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>
                Suspicious IP Addresses
              </Text>
              {suspiciousActivity.suspicious_ips.map(
                (item: any, index: number) => (
                  <View key={index} style={styles.suspiciousItem}>
                    <Ionicons name="globe" size={20} color="#FF9800" />
                    <View style={styles.suspiciousContent}>
                      <Text style={styles.suspiciousTitle}>
                        {item.ip_address}
                      </Text>
                      <Text style={styles.suspiciousSubtitle}>
                        {item.count} failed attempts •{" "}
                        {item.usernames?.length || 0} users • Last:{" "}
                        {new Date(item.last_attempt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </View>
          )}

        {suspiciousActivity.suspicious_users &&
          suspiciousActivity.suspicious_users.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Suspicious Usernames</Text>
              {suspiciousActivity.suspicious_users.map(
                (item: any, index: number) => (
                  <View key={index} style={styles.suspiciousItem}>
                    <Ionicons name="person" size={20} color="#FF9800" />
                    <View style={styles.suspiciousContent}>
                      <Text style={styles.suspiciousTitle}>
                        {item.username}
                      </Text>
                      <Text style={styles.suspiciousSubtitle}>
                        {item.count} failed attempts • {item.ips?.length || 0}{" "}
                        IPs • Last:{" "}
                        {new Date(item.last_attempt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </View>
          )}
      </View>
    );
  };

  const renderSessions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="people" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>Active Sessions</Text>
      </View>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>No active sessions</Text>
      ) : (
        <View style={styles.listContainer}>
          {sessions.map((session: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="person-circle" size={20} color="#007AFF" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>
                  {session.username} ({session.role})
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {session.ip_address} • Created:{" "}
                  {new Date(session.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAuditLog = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text" size={24} color="#9C27B0" />
        <Text style={styles.sectionTitle}>Security Audit Log</Text>
      </View>
      {auditLog.length === 0 ? (
        <Text style={styles.emptyText}>
          No audit log entries in the last 24 hours
        </Text>
      ) : (
        <View style={styles.listContainer}>
          {auditLog.map((log: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="shield" size={20} color="#9C27B0" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{log.action}</Text>
                <Text style={styles.listItemSubtitle}>
                  {log.user} • {log.ip_address} •{" "}
                  {new Date(log.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderIpTracking = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="globe" size={24} color="#00BCD4" />
        <Text style={styles.sectionTitle}>IP Address Tracking</Text>
      </View>
      {ipTracking.length === 0 ? (
        <Text style={styles.emptyText}>No IP tracking data available</Text>
      ) : (
        <View style={styles.listContainer}>
          {ipTracking.map((ip: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="globe" size={20} color="#00BCD4" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{ip.ip_address}</Text>
                <Text style={styles.listItemSubtitle}>
                  {ip.total_attempts} attempts ({ip.successful_logins} success,{" "}
                  {ip.failed_logins} failed) • {ip.unique_user_count} users
                </Text>
                <Text style={styles.listItemSubtitle}>
                  First seen: {new Date(ip.first_seen).toLocaleString()} • Last
                  seen: {new Date(ip.last_seen).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading && !summary) {
    return (
      <AuroraBackground>
        <View style={styles.centered}>
          <LoadingSpinner size={36} color={auroraTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading security data...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <ScreenHeader
        title="Security Dashboard"
        subtitle="Monitoring & Audit"
        showBackButton
        customRightContent={
          <AnimatedPressable
            style={styles.refreshButton}
            onPress={() => loadData(true)}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={auroraTheme.colors.text.primary}
              style={refreshing ? styles.refreshingIcon : undefined}
            />
          </AnimatedPressable>
        }
      />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { id: "summary", label: "Summary", icon: "stats-chart" },
          { id: "failed", label: "Failed Logins", icon: "close-circle" },
          { id: "suspicious", label: "Suspicious", icon: "warning" },
          { id: "sessions", label: "Sessions", icon: "people" },
          { id: "audit", label: "Audit Log", icon: "document-text" },
          { id: "ips", label: "IP Tracking", icon: "globe" },
        ].map((tab) => (
          <AnimatedPressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={
                activeTab === tab.id
                  ? auroraTheme.colors.primary[500]
                  : auroraTheme.colors.text.muted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && styles.contentContainerWeb,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={auroraTheme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={isWeb}
      >
        {activeTab === "summary" && renderSummary()}
        {activeTab === "failed" && renderFailedLogins()}
        {activeTab === "suspicious" && renderSuspiciousActivity()}
        {activeTab === "sessions" && renderSessions()}
        {activeTab === "audit" && renderAuditLog()}
        {activeTab === "ips" && renderIpTracking()}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Ionicons
              name="refresh-circle"
              size={16}
              color={auroraTheme.colors.text.muted}
            />
            <Text style={styles.footerText}>Auto-refresh every 30 seconds</Text>
          </View>
          <View style={styles.footerRow}>
            <Ionicons
              name="time"
              size={16}
              color={auroraTheme.colors.text.muted}
            />
            <Text style={styles.footerText}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: auroraTheme.colors.text.primary,
    fontSize: 16,
  },
  refreshButton: {
    padding: 8,
    borderRadius: auroraTheme.borderRadius.md,
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  tabsContainer: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  tabsContent: {
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: 8,
    borderRadius: auroraTheme.borderRadius.md,
    marginRight: 8,
    backgroundColor: auroraTheme.colors.surface.elevated,
    gap: 6,
  },
  activeTab: {
    backgroundColor: `${auroraTheme.colors.primary[500]}20`,
    borderWidth: 1,
    borderColor: auroraTheme.colors.primary[500],
  },
  tabText: {
    color: auroraTheme.colors.text.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: auroraTheme.colors.primary[500],
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: auroraTheme.spacing.lg,
    paddingBottom: 32,
  },
  contentContainerWeb: {
    padding: isWeb ? 32 : auroraTheme.spacing.lg,
    maxWidth: isWeb ? 1400 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.lg,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: auroraTheme.spacing.lg,
    flex: 1,
    minWidth: isWeb && isTablet ? "22%" : "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
    textAlign: "center",
  },
  recentEvents: {
    marginTop: auroraTheme.spacing.lg,
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.lg,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
    gap: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventAction: {
    fontSize: 14,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    textTransform: "capitalize",
  },
  eventUser: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 2,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.lg,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    gap: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
  },
  suspiciousItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${auroraTheme.colors.warning[500]}15`,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.lg,
    borderWidth: 1,
    borderColor: `${auroraTheme.colors.warning[500]}30`,
    marginBottom: 8,
    gap: 12,
  },
  suspiciousContent: {
    flex: 1,
  },
  suspiciousTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: auroraTheme.colors.warning[500],
  },
  suspiciousSubtitle: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
  },
  subsection: {
    marginTop: auroraTheme.spacing.lg,
  },
  emptyText: {
    color: auroraTheme.colors.text.muted,
    fontSize: 14,
    textAlign: "center",
    padding: 32,
    fontStyle: "italic",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingTop: 32,
    gap: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: auroraTheme.colors.text.muted,
  },
});
