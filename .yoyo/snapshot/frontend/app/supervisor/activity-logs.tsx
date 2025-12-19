/**
 * Activity Logs Screen - View application activity and audit logs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { useTheme } from '../../hooks/useTheme';
import { getActivityLogs, getActivityStats } from '../../services/api';
import { useToast } from '../../services/toastService';

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
  const theme = useTheme();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  const loadLogs = async (pageNum: number = 1) => {
    try {
      setLoading(pageNum === 1);
      const response = await getActivityLogs(pageNum, 50);
      if (pageNum === 1) {
        setLogs(response.activities || []);
      } else {
        setLogs([...logs, ...(response.activities || [])]);
      }
      setHasMore(response.pagination?.has_next || false);
    } catch (error: any) {
      showToast(`Failed to load logs: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getActivityStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadLogs(1);
    loadStats();
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadLogs(nextPage);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.colors.success || '#00E676';
      case 'error':
        return theme.colors.error || '#FF5252';
      case 'warning':
        return theme.colors.warning || '#FFC107';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      login: 'log-in',
      logout: 'log-out',
      scan_item: 'barcode',
      create_session: 'add-circle',
      approve_count: 'checkmark-circle',
      reject_count: 'close-circle',
      refresh_stock: 'refresh',
      sync: 'sync',
    };
    return iconMap[action] || 'ellipse';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Activity Logs"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Statistics */}
        {stats && (
          <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
              Statistics
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.total || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Activities
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#00E676' }]}>
                  {stats.by_status?.success || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Success
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FF5252' }]}>
                  {stats.by_status?.error || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Errors
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Activity Logs */}
        {loading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading activity logs...
            </Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No activity logs found
            </Text>
          </View>
        ) : (
          <>
            {logs.map((log) => (
              <View
                key={log.id}
                style={[styles.logItem, { backgroundColor: theme.colors.card }]}
              >
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <Ionicons
                      name={getActionIcon(log.action) as any}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <View style={styles.logInfo}>
                      <Text style={[styles.logAction, { color: theme.colors.text }]}>
                        {log.action.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={[styles.logUser, { color: theme.colors.textSecondary }]}>
                        {log.user} ({log.role})
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(log.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(log.status) },
                      ]}
                    >
                      {log.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.logTimestamp, { color: theme.colors.textSecondary }]}>
                  {formatTimestamp(log.timestamp)}
                </Text>

                {log.entity_type && (
                  <Text style={[styles.logEntity, { color: theme.colors.textSecondary }]}>
                    {log.entity_type}: {log.entity_id || 'N/A'}
                  </Text>
                )}

                {log.error_message && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#FF5252" />
                    <Text style={styles.errorText}>{log.error_message}</Text>
                  </View>
                )}

                {Object.keys(log.details || {}).length > 0 && (
                  <Text style={[styles.logDetails, { color: theme.colors.textSecondary }]}>
                    {JSON.stringify(log.details, null, 2)}
                  </Text>
                )}
              </View>
            ))}

            {hasMore && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: theme.colors.primary }]}
                onPress={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 64,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  logItem: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  logUser: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logTimestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  logEntity: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF5252',
  },
  logDetails: {
    fontSize: 11,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  loadMoreButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
