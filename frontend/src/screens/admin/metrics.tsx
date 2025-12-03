import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePermissions } from '../../hooks/usePermissions';
import { getMetricsStats, getMetricsHealth, getSyncStatus, triggerManualSync } from '../../services/api';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isTablet = width > 768;
const cardWidth = isWeb && isTablet ? '30%' : isWeb ? '48%' : '48%';

export default function MetricsScreen() {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!hasRole('admin')) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to view system metrics.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [statsResponse, healthResponse, syncResponse] = await Promise.all([
        getMetricsStats(),
        getMetricsHealth(),
        getSyncStatus().catch(() => ({ success: false, data: null })), // Sync status is optional
      ]);
      setStats(statsResponse.data);
      setHealth(healthResponse.data);
      if (syncResponse.success) {
        setSyncStatus(syncResponse.data);
      }
      setLastUpdate(new Date());
    } catch (error: any) {
      if (!isRefresh) {
        Alert.alert('Error', error.message || 'Failed to load metrics');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadMetrics(true);
  };

  const handleTriggerSync = async () => {
    try {
      const result = await triggerManualSync();
      if (result.success) {
        Alert.alert('Success', 'Sync triggered successfully');
        setTimeout(() => loadMetrics(true), 1000); // Refresh status after 1 second
      } else {
        Alert.alert('Error', result.error || 'Failed to trigger sync');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to trigger sync');
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    color: string = '#fff',
    icon?: keyof typeof Ionicons.glyphMap,
    subtitle?: string
  ) => (
    <View style={[styles.metricCard, isWeb && styles.metricCardWeb] as any}>
      {icon && (
        <View style={styles.metricIconContainer}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      )}
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading metrics...</Text>
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
          {!isWeb && <Text style={styles.backButtonText}>Back</Text>}
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Ionicons name="stats-chart" size={28} color="#fff" style={styles.titleIcon} />
          <Text style={styles.title}>System Metrics</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadMetrics(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh"
              size={24}
              color="#007AFF"
              style={refreshing && styles.refreshingIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlPanelButton}
            onPress={() => router.push('/admin/control-panel' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.contentContainerWeb]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={isWeb}
      >
        {health && (
          <View style={[styles.section, styles.healthSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>System Health</Text>
            </View>
            <View style={styles.healthCard}>
              <View style={styles.healthIndicator}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: health.status === 'healthy' ? '#4CAF50' : '#f44336' },
                  ]}
                />
                <Text style={styles.healthText}>
                  {health.status === 'healthy' ? 'System Healthy' : 'System Issues Detected'}
                </Text>
              </View>
              <View style={styles.healthDetails}>
                {health.mongodb && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons
                      name={health.mongodb.status === 'connected' ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={health.mongodb.status === 'connected' ? '#4CAF50' : '#f44336'}
                    />
                    <Text style={styles.healthDetail}>
                      MongoDB: {health.mongodb.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </Text>
                  </View>
                )}
                {health.dependencies?.sql_server && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons
                      name={health.dependencies.sql_server.status === 'healthy' ? 'checkmark-circle' : 'warning'}
                      size={18}
                      color={health.dependencies.sql_server.status === 'healthy' ? '#4CAF50' : '#ff9800'}
                    />
                    <Text style={[
                      styles.healthDetail,
                      { color: health.dependencies.sql_server.status === 'healthy' ? '#4CAF50' : '#ff9800' }
                    ]}>
                      SQL Server: {health.dependencies.sql_server.status === 'healthy' ? 'Connected' : 'Unavailable'}
                    </Text>
                  </View>
                )}
                {health.uptime && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons name="time" size={18} color="#007AFF" />
                    <Text style={styles.healthDetail}>
                      Uptime: {formatUptime(health.uptime)}
                    </Text>
                  </View>
                )}
              </View>
              {health.dependencies?.sql_server?.status !== 'healthy' && (
                <View style={styles.notificationBanner}>
                  <Ionicons name="warning" size={20} color="#ff9800" />
                  <Text style={styles.notificationText}>
                    SQL Server is unavailable. App is running in offline mode. ERP sync features are disabled.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {syncStatus && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sync" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Sync Status</Text>
            </View>
            <View style={styles.syncStatusCard}>
              <View style={styles.syncStatusRow}>
                <View style={styles.syncStatusLabelRow}>
                  <Ionicons name="server" size={20} color="#aaa" />
                  <Text style={styles.syncStatusLabel}>SQL Server Connection</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: syncStatus.sql_available ? '#4CAF50' : '#ff9800' }
                ]}>
                  <Ionicons
                    name={syncStatus.sql_available ? 'checkmark' : 'close'}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.statusBadgeText}>
                    {syncStatus.sql_available ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
              </View>
              {syncStatus.sync_in_progress && (
                <View style={styles.syncProgressRow}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.syncProgressText}>Sync in progress...</Text>
                </View>
              )}
              {syncStatus.stats && (
                <View style={styles.syncStatsRow}>
                  <View style={styles.syncStatItem}>
                    <Ionicons name="play-circle" size={16} color="#007AFF" />
                    <Text style={styles.syncStatsText}>
                      Triggered: {syncStatus.stats.syncs_triggered || 0}
                    </Text>
                  </View>
                  <View style={styles.syncStatItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.syncStatsText}>
                      Completed: {syncStatus.stats.syncs_completed || 0}
                    </Text>
                  </View>
                  {syncStatus.last_sync_attempt && (
                    <View style={styles.syncStatItem}>
                      <Ionicons name="time" size={16} color="#888" />
                      <Text style={styles.syncStatsText}>
                        Last: {new Date(syncStatus.last_sync_attempt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {syncStatus.sql_available && !syncStatus.sync_in_progress && (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleTriggerSync}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sync" size={18} color="#fff" />
                  <Text style={styles.syncButtonText}>Trigger Manual Sync</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {stats && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="speedometer" size={24} color="#007AFF" />
                <Text style={styles.sectionTitle}>API Performance</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  'Total Requests',
                  stats.total_requests?.toLocaleString() || '0',
                  '#007AFF',
                  'stats-chart'
                )}
                {renderMetricCard(
                  'Success Rate',
                  `${((stats.success_rate || 0) * 100).toFixed(1)}%`,
                  stats.success_rate > 0.95 ? '#4CAF50' : '#FF9800',
                  stats.success_rate > 0.95 ? 'checkmark-circle' : 'warning'
                )}
                {renderMetricCard(
                  'Avg Response Time',
                  `${(stats.avg_response_time || 0).toFixed(0)}ms`,
                  stats.avg_response_time < 500 ? '#4CAF50' : '#FF9800',
                  'time'
                )}
                {renderMetricCard(
                  'Error Count',
                  stats.error_count || '0',
                  '#f44336',
                  'alert-circle'
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>User Activity</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard('Active Users', stats.active_users || '0', '#007AFF', 'people-circle')}
                {renderMetricCard('Total Sessions', stats.total_sessions || '0', '#fff', 'calendar')}
                {renderMetricCard('Active Sessions', stats.active_sessions || '0', '#4CAF50', 'radio-button-on')}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="server" size={24} color="#FF9800" />
                <Text style={styles.sectionTitle}>Database Statistics</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard('Total Count Lines', stats.total_count_lines?.toLocaleString() || '0', '#fff', 'list')}
                {renderMetricCard('Pending Approvals', stats.pending_approvals || '0', '#FF9800', 'time-outline')}
                {renderMetricCard('Total Items', stats.total_items?.toLocaleString() || '0', '#fff', 'cube')}
                {renderMetricCard('Unknown Items', stats.unknown_items || '0', '#f44336', 'help-circle')}
              </View>
            </View>

            {stats.top_endpoints && stats.top_endpoints.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pulse" size={24} color="#9C27B0" />
                  <Text style={styles.sectionTitle}>Top Endpoints</Text>
                </View>
                <View style={styles.endpointsContainer}>
                  {stats.top_endpoints.map((endpoint: any, index: number) => (
                    <View key={index} style={styles.endpointRow}>
                      <View style={styles.endpointInfo}>
                        <Ionicons name="link" size={16} color="#007AFF" />
                        <Text style={styles.endpointPath}>{endpoint.path}</Text>
                      </View>
                      <View style={styles.endpointBadge}>
                        <Text style={styles.endpointCount}>{endpoint.count}</Text>
                        <Text style={styles.endpointLabel}>requests</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {stats.recent_errors && stats.recent_errors.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning" size={24} color="#f44336" />
                  <Text style={styles.sectionTitle}>Recent Errors</Text>
                </View>
                <View style={styles.errorsContainer}>
                  {stats.recent_errors.map((error: any, index: number) => (
                    <View key={index} style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={20} color="#f44336" />
                      <Text style={styles.errorType}>{error.type}</Text>
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorCount}>{error.count}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Ionicons name="refresh-circle" size={16} color="#666" />
            <Text style={styles.footerText}>Auto-refresh every 30 seconds</Text>
          </View>
          <View style={styles.footerRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.footerText}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    ...(Platform.OS === 'web' ? {
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    } : {}),
  } as any,
  headerWeb: {
    paddingHorizontal: isWeb ? 32 : 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  controlPanelButton: {
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
    maxWidth: isWeb ? 1400 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  healthSection: {
    marginBottom: 32,
  },
  healthCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    }),
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 8px currentColor',
    }),
  },
  healthText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  healthDetails: {
    gap: 12,
  },
  healthDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthDetail: {
    fontSize: 14,
    color: '#aaa',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    ...(Platform.OS === 'web' && {
      justifyContent: 'flex-start',
    }),
  },
  metricCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: cardWidth,
    maxWidth: isWeb && isTablet ? '30%' : '100%',
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      },
    }),
  },
  metricCardWeb: {
    ...(Platform.OS === 'web' ? {
      cursor: 'default' as const,
    } : {}),
  } as any,
  metricIconContainer: {
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  endpointsContainer: {
    gap: 8,
  },
  endpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' && {
      transition: 'background-color 0.2s',
      ':hover': {
        backgroundColor: '#222',
      },
    }),
  },
  endpointInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  endpointPath: {
    fontSize: 14,
    color: '#fff',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
  endpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#007AFF20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  endpointCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
  },
  endpointLabel: {
    fontSize: 11,
    color: '#007AFF',
    opacity: 0.7,
  },
  errorsContainer: {
    gap: 8,
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f4433615',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f4433630',
    gap: 12,
  },
  errorType: {
    flex: 1,
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  errorBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ff980015',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    color: '#ff9800',
    lineHeight: 20,
  },
  errorTypeDuplicate: {
    flex: 1,
    fontSize: 14,
    color: '#f44336',
  },
  errorCountDuplicate: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  syncStatusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    }),
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncStatusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncStatusLabel: {
    fontSize: 15,
    color: '#aaa',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    }),
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  syncProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  syncProgressText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
  syncStatsRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 10,
  },
  syncStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncStatsText: {
    fontSize: 13,
    color: '#aaa',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.1s',
      ':hover': {
        backgroundColor: '#0056CC',
      },
      ':active': {
        transform: 'scale(0.98)',
      },
    }),
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerDuplicate: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 32,
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerTextDuplicate: {
    fontSize: 12,
    color: '#666',
  },
});
