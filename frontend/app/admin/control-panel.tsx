import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { usePermission } from "../../src/hooks/usePermission";
import {
  getServicesStatus,
  getSystemIssues,
  getLoginDevices,
  getSystemHealthScore,
  getSystemStats,
  startService,
  stopService,
  getMetrics,
  getSessionsAnalytics,
  getSecuritySummary,
} from "../../src/services/api";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

// Constants to replace magic numbers
const API_TIMEOUT_MS = 5000;
const LOADING_TIMEOUT_MS = 10000;
const AUTO_REFRESH_INTERVAL_MS = 10000;

interface ServiceStatus {
  running: boolean;
  port?: number | undefined;
  pid?: number | undefined;
  url?: string | undefined;
  uptime?: number | undefined;
  status?: string | undefined;
}

interface ServicesStatus {
  backend: ServiceStatus;
  frontend: ServiceStatus;
  mongodb: ServiceStatus;
  sql_server: ServiceStatus;
}

export default function ControlPanelScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ServicesStatus | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  // const [metrics, setMetrics] = useState<any>(null);
  // const [sessionsAnalytics, setSessionsAnalytics] = useState<any>(null);
  // const [securitySummary, setSecuritySummary] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);

      const withTimeout = <T,>(
        promise: Promise<T>,
        timeoutMs: number = API_TIMEOUT_MS,
      ): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
          ),
        ]);
      };

      const [
        servicesRes,
        issuesRes,
        devicesRes,
        healthRes,
        statsRes,
        // metricsRes,
        // sessionsRes,
        // securityRes,
      ] = await Promise.allSettled([
        withTimeout(
          getServicesStatus().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getSystemIssues().catch(() => ({ data: { issues: [] } })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getLoginDevices().catch(() => ({ data: { devices: [] } })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getSystemHealthScore().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getSystemStats().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getMetrics().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getSessionsAnalytics().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
        withTimeout(
          getSecuritySummary().catch(() => ({ data: null })),
          API_TIMEOUT_MS,
        ),
      ]);

      if (servicesRes.status === "fulfilled" && servicesRes.value?.data) {
        setServices(servicesRes.value.data);
      }
      if (issuesRes.status === "fulfilled" && issuesRes.value?.data) {
        setIssues(issuesRes.value.data.issues || []);
      }
      if (devicesRes.status === "fulfilled" && devicesRes.value?.data) {
        setDevices(devicesRes.value.data.devices || []);
      }
      if (healthRes.status === "fulfilled" && healthRes.value?.data) {
        setHealthScore(healthRes.value.data.score);
      }
      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        setSystemStats(statsRes.value.data);
      }
      // if (metricsRes.status === "fulfilled" && metricsRes.value?.data) {
      //   setMetrics(metricsRes.value.data);
      // }
      // if (sessionsRes.status === "fulfilled" && sessionsRes.value?.data) {
      //   setSessionsAnalytics(sessionsRes.value.data);
      // }
      // if (securityRes.status === "fulfilled" && securityRes.value?.data) {
      //   setSecuritySummary(securityRes.value.data);
      // }

      setLastUpdate(new Date());
    } catch (error: any) {
      __DEV__ && console.error("Control panel loadData error:", error);
      if (!services) {
        setServices({
          backend: { running: false, status: "unknown" },
          frontend: { running: false, status: "unknown" },
          mongodb: { running: false, status: "unknown" },
          sql_server: { running: false, status: "unknown" },
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [services]);

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to access the control panel.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }

    loadData();

    const maxTimeout = setTimeout(() => {
      if (loading) {
        __DEV__ &&
          console.warn("Control panel loading timeout - forcing render");
        setLoading(false);
        if (!services) {
          setServices({
            backend: { running: false, status: "unknown" },
            frontend: { running: false, status: "unknown" },
            mongodb: { running: false, status: "unknown" },
            sql_server: { running: false, status: "unknown" },
          });
        }
      }
    }, LOADING_TIMEOUT_MS);

    const interval = setInterval(() => {
      if (!loading) {
        loadData();
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(maxTimeout);
      clearInterval(interval);
    };
  }, [hasRole, router, loadData, loading, services]);

  const handleServiceAction = async (
    service: string,
    action: "start" | "stop",
  ) => {
    try {
      let response;
      if (action === "start") {
        response = await startService(service);
      } else {
        response = await stopService(service);
      }
      if (response?.data || response) {
        Alert.alert(
          "Success",
          response?.message || `${service} ${action} command issued`,
        );
        setTimeout(() => loadData(), 2000);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
        error?.message ||
        `Failed to ${action} ${service}`,
      );
    }
  };

  const formatUptime = (seconds?: number | undefined) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert("Copied", "URL copied to clipboard");
    } catch {
      Alert.alert("Error", "Failed to copy URL");
    }
  };

  const handleViewLogs = (service: string) => {
    router.push({
      pathname: "/admin/logs" as any,
      params: { service },
    });
  };

  const handleSqlConfig = () => {
    router.push("/admin/sql-config" as any);
  };

  const renderServiceCard = (
    title: string,
    service: ServiceStatus,
    serviceKey: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
  ) => (
    <View style={[styles.serviceCard, isWeb && styles.serviceCardWeb] as any}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceTitleRow}>
          <Ionicons name={icon} size={24} color={color} />
          <Text style={styles.serviceTitle}>{title}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: service.running ? "#4CAF50" : "#f44336" },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: service.running ? "#fff" : "#fff" },
            ]}
          />
          <Text style={styles.statusBadgeText}>
            {service.running ? "Running" : "Stopped"}
          </Text>
        </View>
      </View>

      {service.running && (
        <View style={styles.serviceDetails}>
          {service.port && (
            <View style={styles.serviceDetailRow}>
              <Ionicons name="server" size={16} color="#aaa" />
              <Text style={styles.serviceDetailText}>Port: {service.port}</Text>
            </View>
          )}
          {service.pid && (
            <View style={styles.serviceDetailRow}>
              <Ionicons name="code-working" size={16} color="#aaa" />
              <Text style={styles.serviceDetailText}>PID: {service.pid}</Text>
            </View>
          )}
          {service.uptime && (
            <View style={styles.serviceDetailRow}>
              <Ionicons name="time" size={16} color="#aaa" />
              <Text style={styles.serviceDetailText}>
                Uptime: {formatUptime(service.uptime)}
              </Text>
            </View>
          )}
          {service.url && (
            <TouchableOpacity
              style={styles.serviceDetailRow}
              onPress={() => handleCopyUrl(service.url!)}
              activeOpacity={0.7}
            >
              <Ionicons name="link" size={16} color="#007AFF" />
              <Text
                style={[styles.serviceDetailText, { color: "#007AFF" }] as any}
              >
                {service.url}
              </Text>
              <Ionicons
                name="copy-outline"
                size={14}
                color="#007AFF"
                style={styles.copyIcon as any}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.serviceActions}>
        {service.running && (
          <TouchableOpacity
            style={[styles.actionButton, styles.logsButton] as any}
            onPress={() => handleViewLogs(serviceKey)}
          >
            <Ionicons name="document-text" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Logs</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.startButton,
            service.running && styles.actionButtonDisabled,
          ]}
          onPress={() => {
            if (!service.running) {
              Alert.alert(
                "Start Service",
                `Are you sure you want to start ${title}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Start",
                    onPress: () => handleServiceAction(serviceKey, "start"),
                  },
                ],
              );
            }
          }}
          disabled={service.running}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.stopButton,
            !service.running && styles.actionButtonDisabled,
          ]}
          onPress={() => {
            if (service.running) {
              Alert.alert(
                "Stop Service",
                `Are you sure you want to stop ${title}? This may affect system functionality.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Stop",
                    style: "destructive",
                    onPress: () => handleServiceAction(serviceKey, "stop"),
                  },
                ],
              );
            }
          }}
          disabled={!service.running}
        >
          <Ionicons name="stop" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !services && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading control panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          {!isWeb ? <Text style={styles.backButtonText}>Back</Text> : null}
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Ionicons
            name="settings"
            size={28}
            color="#fff"
            style={styles.titleIcon}
          />
          <Text style={styles.title}>Master Control Panel</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadData}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh"
            size={24}
            color="#007AFF"
            style={refreshing && styles.refreshingIcon}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && styles.contentContainerWeb,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={isWeb}
      >
        {systemStats && (
          <View style={styles.quickStatsSection}>
            <View style={styles.quickStatCard}>
              <Ionicons name="server" size={24} color="#007AFF" />
              <Text style={styles.quickStatValue}>
                {systemStats.running_services}/{systemStats.total_services}
              </Text>
              <Text style={styles.quickStatLabel}>Services</Text>
            </View>
            {healthScore !== null && (
              <View style={styles.quickStatCard}>
                <Ionicons
                  name="heart"
                  size={24}
                  color={
                    healthScore >= 80
                      ? "#4CAF50"
                      : healthScore >= 50
                        ? "#FF9800"
                        : "#f44336"
                  }
                />
                <Text
                  style={[
                    styles.quickStatValue,
                    {
                      color:
                        healthScore >= 80
                          ? "#4CAF50"
                          : healthScore >= 50
                            ? "#FF9800"
                            : "#f44336",
                    },
                  ]}
                >
                  {healthScore}%
                </Text>
                <Text style={styles.quickStatLabel}>Health</Text>
              </View>
            )}
            <View style={styles.quickStatCard}>
              <Ionicons name="people" size={24} color="#4CAF50" />
              <Text style={styles.quickStatValue}>
                {systemStats.active_sessions || 0}
              </Text>
              <Text style={styles.quickStatLabel}>Active</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="phone-portrait" size={24} color="#9C27B0" />
              <Text style={styles.quickStatValue}>{devices.length}</Text>
              <Text style={styles.quickStatLabel}>Devices</Text>
            </View>
          </View>
        )}

        {issues.length > 0 && (
          <View style={styles.issuesBanner}>
            <Ionicons name="warning" size={24} color="#ff9800" />
            <View style={styles.issuesContent}>
              <Text style={styles.issuesTitle}>
                {issues.filter((i: any) => i.severity === "critical").length}{" "}
                Critical Issue(s)
              </Text>
              <Text style={styles.issuesText}>
                {issues[0]?.message || "System issues detected"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewIssuesButton}
              onPress={() => router.push("/admin/control-panel" as any)}
            >
              <Text style={styles.viewIssuesButtonText}>View All</Text>
            </TouchableOpacity>
          </View>
        )}

        {services && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="server" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Services Management</Text>
            </View>
            <View style={styles.servicesGrid}>
              {renderServiceCard(
                "Backend Server",
                services.backend,
                "backend",
                "server",
                "#007AFF",
              )}
              {renderServiceCard(
                "Frontend (Expo)",
                services.frontend,
                "frontend",
                "globe",
                "#4CAF50",
              )}
              {renderServiceCard(
                "MongoDB",
                services.mongodb,
                "mongodb",
                "cube",
                "#13AA52",
              )}
              {renderServiceCard(
                "SQL Server",
                services.sql_server,
                "sql_server",
                "server",
                "#FF9800",
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/admin/settings" as any)}
            >
              <Ionicons name="settings" size={32} color="#007AFF" />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/admin/metrics" as any)}
            >
              <Ionicons name="stats-chart" size={32} color="#4CAF50" />
              <Text style={styles.quickActionText}>Metrics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/admin/permissions" as any)}
            >
              <Ionicons name="shield-checkmark" size={32} color="#FF9800" />
              <Text style={styles.quickActionText}>Permissions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/admin/reports" as any)}
            >
              <Ionicons name="document-text" size={32} color="#9C27B0" />
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleSqlConfig}
            >
              <Ionicons name="server" size={32} color="#FF9800" />
              <Text style={styles.quickActionText}>SQL Config</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/admin/security" as any)}
            >
              <Ionicons name="shield-checkmark" size={32} color="#4CAF50" />
              <Text style={styles.quickActionText}>Security</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/help" as any)}
            >
              <Ionicons name="help-circle" size={32} color="#007AFF" />
              <Text style={styles.quickActionText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>

        {devices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="phone-portrait" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>
                Active Devices ({devices.length})
              </Text>
            </View>
            <View style={styles.devicesList}>
              {devices.slice(0, 5).map((device: any, index: number) => (
                <View key={index} style={styles.deviceCard}>
                  <Ionicons
                    name={
                      device.platform === "web" ? "globe" : "phone-portrait"
                    }
                    size={20}
                    color="#007AFF"
                  />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceUser}>
                      {device.user || "Unknown"}
                    </Text>
                    <Text style={styles.deviceDetails}>
                      {device.platform} • {device.ip_address}
                    </Text>
                  </View>
                  <Text style={styles.deviceTime}>
                    {device.last_activity
                      ? new Date(device.last_activity).toLocaleTimeString()
                      : "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.footerText}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
          <Text style={styles.footerText}>
            Auto-refresh every {AUTO_REFRESH_INTERVAL_MS / 1000} seconds
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: Platform.OS === "web" ? 20 : 16,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    ...(Platform.OS === "web"
      ? {
        position: "sticky" as const,
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }
      : {}),
  } as any,
  headerWeb: {
    paddingHorizontal: isWeb ? 32 : 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  contentContainerWeb: {
    padding: isWeb ? 32 : 16,
    maxWidth: isWeb ? 1400 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  issuesBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff980015",
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  issuesContent: {
    flex: 1,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 4,
  },
  issuesText: {
    fontSize: 14,
    color: "#ff9800",
    opacity: 0.9,
  },
  viewIssuesButton: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewIssuesButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  } as const,
  serviceCardWeb: {
    // Web-specific styles handled via conditional rendering
  } as const,
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  serviceDetails: {
    gap: 8,
    marginBottom: 16,
  },
  serviceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceDetailText: {
    fontSize: 14,
    color: "#aaa",
  },
  serviceActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#f44336",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  logsButton: {
    backgroundColor: "#9C27B0",
  },
  copyIcon: {
    marginLeft: 8,
  },
  quickStatsSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  quickStatCard: {
    flex: 1,
    minWidth: isWeb && isTablet ? "22%" : "45%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  } as any,
  quickStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: isWeb && isTablet ? "22%" : "45%",
    borderWidth: 1,
    borderColor: "#333",
  } as any,
  quickActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  devicesList: {
    gap: 8,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    gap: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 12,
    color: "#aaa",
  },
  deviceTime: {
    fontSize: 12,
    color: "#666",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: "#666",
  },
});
