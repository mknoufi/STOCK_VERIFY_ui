/**
 * Error Logs Screen - View application errors and exceptions for monitoring
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/layout/Header';
import { useTheme } from '../../src/hooks/useTheme';
import {
  getErrorLogs,
  clearErrorLogs,
  getErrorStats,
  getErrorDetail,
  resolveError,
} from '../../src/services/api/api';
import { useToast } from '../../src/components/feedback/ToastProvider';

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
  const theme = useTheme();
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
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    resolved: undefined as boolean | undefined,
  });

  const loadErrors = React.useCallback(
    async (pageNum: number = 1) => {
      try {
        setLoading(pageNum === 1);
        const response = await getErrorLogs(
          pageNum,
          50,
          filters.severity || undefined,
          undefined,
          undefined,
          filters.resolved
        );
        if (pageNum === 1) {
          setErrors(response.errors || []);
        } else {
          setErrors((prevErrors) => [...prevErrors, ...(response.errors || [])]);
        }
        setHasMore(response.pagination?.has_next || false);
      } catch (error: any) {
        show('Failed to load error logs', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, show]
  );

  const loadStats = React.useCallback(async () => {
    try {
      const statsData = await getErrorStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadErrors();
    loadStats();
  }, [loadErrors, loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([loadErrors(1), loadStats()]);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadErrors(nextPage);
    }
  };

  const handleErrorClick = async (error: ErrorLog) => {
    try {
      const detail = await getErrorDetail(error.id);
      setSelectedError(detail);
      setShowDetailModal(true);
    } catch (error: any) {
      show(`Failed to load error details: ${error.message}`, 'error');
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearErrorLogs();
      show('Error logs cleared', 'success');
      handleRefresh(); // Refresh logs after clearing
    } catch (error: any) {
      show('Failed to clear error logs', 'error');
    }
  };

  const handleResolveError = async (id: string) => {
    try {
      await resolveError(id);
      show('Error marked as resolved', 'success');
      handleRefresh(); // Refresh logs after resolving
    } catch (error: any) {
      show('Failed to resolve error', 'error');
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      setResolving(true);
      await resolveError(selectedError.id, resolutionNote);
      show('Error marked as resolved', 'success');
      setShowResolveModal(false);
      setShowDetailModal(false);
      setResolutionNote('');
      handleRefresh();
    } catch (error: any) {
      show(`Failed to resolve error: ${error.message}`, 'error');
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
      case 'critical':
        return '#FF5252';
      case 'error':
        return '#FF5252';
      case 'warning':
        return '#FFC107';
      case 'info':
        return '#2196F3';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'alert-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'ellipse';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Error Monitoring" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Statistics */}
        {stats && (
          <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Error Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.total || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Errors
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FF5252' }]}>
                  {stats.by_severity?.critical || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Critical
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FF5252' }]}>
                  {stats.by_severity?.error || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Errors
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFC107' }]}>
                  {stats.unresolved || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Unresolved
                </Text>
              </View>
            </View>
            <View style={styles.recentContainer}>
              <Text style={[styles.recentText, { color: theme.colors.textSecondary }]}>
                Last 24 hours: {stats.recent_24h || 0} errors
              </Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={[styles.filtersContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Filters</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background },
                filters.severity === '' && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({ ...filters, severity: '' })}
            >
              <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>All</Text>
            </TouchableOpacity>
            {['critical', 'error', 'warning'].map((sev) => (
              <TouchableOpacity
                key={sev}
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.background },
                  filters.severity === sev && styles.filterButtonActive,
                ]}
                onPress={() => setFilters({ ...filters, severity: sev })}
              >
                <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background },
                filters.resolved === undefined && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({ ...filters, resolved: undefined })}
            >
              <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
                All Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background },
                filters.resolved === false && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({ ...filters, resolved: false })}
            >
              <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
                Unresolved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.background },
                filters.resolved === true && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({ ...filters, resolved: true })}
            >
              <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>Resolved</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Logs */}
        {loading && errors.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading error logs...
            </Text>
          </View>
        ) : errors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No errors found
            </Text>
          </View>
        ) : (
          <>
            {errors.map((error) => (
              <TouchableOpacity
                key={error.id}
                style={[styles.errorItem, { backgroundColor: theme.colors.card }]}
                onPress={() => handleErrorClick(error)}
              >
                <View style={styles.errorHeader}>
                  <View style={styles.errorHeaderLeft}>
                    <Ionicons
                      name={getSeverityIcon(error.severity) as any}
                      size={20}
                      color={getSeverityColor(error.severity)}
                    />
                    <View style={styles.errorInfo}>
                      <Text style={[styles.errorType, { color: theme.colors.text }]}>
                        {error.error_type}
                      </Text>
                      <Text
                        style={[styles.errorMessage, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {error.error_message}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(error.severity) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.severityText, { color: getSeverityColor(error.severity) }]}
                    >
                      {error.severity}
                    </Text>
                  </View>
                </View>

                <View style={styles.errorMeta}>
                  <Text style={[styles.errorMetaText, { color: theme.colors.textSecondary }]}>
                    {formatTimestamp(error.timestamp)}
                  </Text>
                  {error.endpoint && (
                    <Text style={[styles.errorMetaText, { color: theme.colors.textSecondary }]}>
                      {error.method} {error.endpoint}
                    </Text>
                  )}
                  {error.user && (
                    <Text style={[styles.errorMetaText, { color: theme.colors.textSecondary }]}>
                      {error.user}
                    </Text>
                  )}
                </View>

                {error.resolved && (
                  <View style={styles.resolvedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00E676" />
                    <Text style={styles.resolvedText}>
                      Resolved by {error.resolved_by} on {formatTimestamp(error.resolved_at!)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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

      {/* Error Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Error Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedError && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Error Type
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selectedError.error_type}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Message
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selectedError.error_message}
                  </Text>
                </View>

                {selectedError.error_code && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Error Code
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.error_code}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Timestamp
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {formatTimestamp(selectedError.timestamp)}
                  </Text>
                </View>

                {selectedError.endpoint && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Endpoint
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.method} {selectedError.endpoint}
                    </Text>
                  </View>
                )}

                {selectedError.user && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      User
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.user} ({selectedError.role})
                    </Text>
                  </View>
                )}

                {selectedError.stack_trace && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Stack Trace
                    </Text>
                    <ScrollView style={styles.stackTraceContainer}>
                      <Text style={[styles.stackTraceText, { color: theme.colors.text }]}>
                        {selectedError.stack_trace}
                      </Text>
                    </ScrollView>
                  </View>
                )}

                {selectedError.resolved && selectedError.resolution_note && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Resolution Note
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.resolution_note}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {selectedError && !selectedError.resolved && (
                <TouchableOpacity
                  style={[styles.resolveButton, { backgroundColor: '#00E676' }]}
                  onPress={() => {
                    setShowDetailModal(false);
                    setShowResolveModal(true);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        visible={showResolveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Resolve Error</Text>
              <TouchableOpacity onPress={() => setShowResolveModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Resolution Note (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.background, color: theme.colors.text },
                ]}
                value={resolutionNote}
                onChangeText={setResolutionNote}
                placeholder="Enter resolution notes..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.resolveButton, { backgroundColor: '#00E676' }]}
                onPress={handleResolve}
                disabled={resolving}
              >
                {resolving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  setShowResolveModal(false);
                  setResolutionNote('');
                }}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  recentText: {
    fontSize: 14,
    textAlign: 'center',
  },
  filtersContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#00E676',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  errorItem: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  errorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  errorInfo: {
    flex: 1,
  },
  errorType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  errorMetaText: {
    fontSize: 12,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  resolvedText: {
    fontSize: 12,
    color: '#00E676',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
  },
  stackTraceContainer: {
    maxHeight: 200,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  stackTraceText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resolveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
