import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAutoLogout } from '../../src/hooks/useAutoLogout';
import api from '../../src/services/api/api';
import { SupervisorLayout } from '../../src/components/layout/SupervisorLayout';
import OnlineStatus from '../../src/components/ui/OnlineStatus';

// Types
interface Session {
  id: string;
  warehouse: string;
  status: 'OPEN' | 'CLOSED' | 'RECONCILE';
  started_at: string;
  ended_at?: string;
  staff_name?: string;
  total_items: number;
  total_variance: number;
  notes?: string;
}

interface DashboardStats {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  reconciledSessions: number;
  totalItems: number;
  totalVariance: number;
  positiveVariance: number;
  negativeVariance: number;
  avgVariancePerSession: number;
  highRiskSessions: number;
}

export default function SupervisorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  useAutoLogout();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    reconciledSessions: 0,
    totalItems: 0,
    totalVariance: 0,
    positiveVariance: 0,
    negativeVariance: 0,
    avgVariancePerSession: 0,
    highRiskSessions: 0,
  });

  // Modal States
  const [showMRPModal, setShowMRPModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // MRP Update States
  const [mrpSearchQuery, setMrpSearchQuery] = useState('');
  const [mrpSearchResults, setMrpSearchResults] = useState<any[]>([]);
  const [mrpLoading, setMrpLoading] = useState(false);
  const [selectedItemForMRP, setSelectedItemForMRP] = useState<any>(null);
  const [newMRP, setNewMRP] = useState('');
  const [isMRPUpdating, setIsMRPUpdating] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'RECONCILE'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'variance' | 'items'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Analytics Data
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Bulk Operations State
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      // Fetch sessions
      const sessionsRes = await api.get('/supervisor/sessions');

      // Apply client-side filtering and sorting
      let filteredSessions = sessionsRes.data;

      if (filterStatus !== 'ALL') {
        filteredSessions = filteredSessions.filter((s: Session) => s.status === filterStatus);
      }

      filteredSessions.sort((a: Session, b: Session) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
            break;
          case 'variance':
            comparison = Math.abs(a.total_variance) - Math.abs(b.total_variance);
            break;
          case 'items':
            comparison = a.total_items - b.total_items;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setSessions(filteredSessions);

      // Calculate stats
      const newStats = filteredSessions.reduce(
        (acc: DashboardStats, session: Session) => {
          acc.totalSessions++;
          if (session.status === 'OPEN') acc.openSessions++;
          if (session.status === 'CLOSED') acc.closedSessions++;
          if (session.status === 'RECONCILE') acc.reconciledSessions++;

          acc.totalItems += session.total_items || 0;
          acc.totalVariance += session.total_variance || 0;

          if ((session.total_variance || 0) > 0) acc.positiveVariance += session.total_variance;
          if ((session.total_variance || 0) < 0) acc.negativeVariance += session.total_variance;

          if (Math.abs(session.total_variance) > 1000) acc.highRiskSessions++; // Example threshold

          return acc;
        },
        {
          totalSessions: 0,
          openSessions: 0,
          closedSessions: 0,
          reconciledSessions: 0,
          totalItems: 0,
          totalVariance: 0,
          positiveVariance: 0,
          negativeVariance: 0,
          avgVariancePerSession: 0,
          highRiskSessions: 0,
        }
      );

      newStats.avgVariancePerSession =
        newStats.totalSessions > 0 ? newStats.totalVariance / newStats.totalSessions : 0;

      setStats(newStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearchMRP = async () => {
    if (!mrpSearchQuery.trim()) return;

    try {
      setMrpLoading(true);
      const res = await api.get(`/items/search?q=${mrpSearchQuery}`);
      setMrpSearchResults(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to search items');
    } finally {
      setMrpLoading(false);
    }
  };

  const updateItemMRP = async () => {
    if (!selectedItemForMRP || !newMRP) return;

    try {
      setIsMRPUpdating(true);
      await api.post('/supervisor/update-mrp', {
        item_code: selectedItemForMRP.item_code,
        new_mrp: parseFloat(newMRP),
      });

      Alert.alert('Success', 'MRP updated successfully');
      setSelectedItemForMRP(null);
      setNewMRP('');
      setMrpSearchResults([]);
      setMrpSearchQuery('');
      setShowMRPModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update MRP');
    } finally {
      setIsMRPUpdating(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      // Simulate fetching detailed analytics
      // In a real app, this would be a dedicated API endpoint
      const analytics = {
        varianceByWarehouse: sessions.reduce((acc: any, s) => {
          acc[s.warehouse] = (acc[s.warehouse] || 0) + s.total_variance;
          return acc;
        }, {}),
        itemsByStaff: sessions.reduce((acc: any, s) => {
          const staff = s.staff_name || 'Unknown';
          acc[staff] = (acc[staff] || 0) + s.total_items;
          return acc;
        }, {}),
        sessionsByDate: sessions.reduce((acc: any, s) => {
          const date = new Date(s.started_at).toLocaleDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}),
      };
      setAnalyticsData(analytics);
    } catch (error) {
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (showAnalyticsModal) {
      fetchAnalytics();
    }
  }, [showAnalyticsModal]);

  // Bulk Operations Logic
  const toggleSessionSelection = (sessionId: string) => {
    const newSelection = new Set(selectedSessions);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      newSelection.add(sessionId);
    }
    setSelectedSessions(newSelection);
  };

  const selectAllSessions = () => {
    const allIds = sessions.map((s) => s.id);
    setSelectedSessions(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  const handleBulkOperation = async (operation: 'close' | 'reconcile' | 'export') => {
    if (selectedSessions.size === 0) return;

    Alert.alert(
      'Confirm Bulk Operation',
      `Are you sure you want to ${operation} ${selectedSessions.size} sessions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              await api.post('/supervisor/bulk-operation', {
                operation,
                session_ids: Array.from(selectedSessions),
              });
              Alert.alert('Success', `Bulk ${operation} completed successfully`);
              setShowBulkModal(false);
              clearSelection();
              loadData();
            } catch (error) {
              Alert.alert('Error', `Failed to perform bulk ${operation}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SupervisorLayout title="Dashboard" screenVariant="default">
      {/* Header Extension (Quick Actions & Online Status) */}
      <View style={styles.headerExtension}>
        <View style={styles.onlineStatusContainer}>
          <OnlineStatus />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
        >
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowMRPModal(true)}>
              <Ionicons name="pricetag-outline" size={24} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Update MRP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setShowFilterModal(true)}>
              <Ionicons name="filter-outline" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Filter</Text>
              {filterStatus !== 'ALL' && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAnalyticsModal(true)}
            >
              <Ionicons name="bar-chart-outline" size={24} color="#FF9800" />
              <Text style={styles.actionButtonText}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setShowBulkModal(true)}>
              <Ionicons name="layers-outline" size={24} color="#9C27B0" />
              <Text style={styles.actionButtonText}>Bulk Ops</Text>
              {selectedSessions.size > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{selectedSessions.size}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="list-outline" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF5252" />
            <Text style={styles.statValue}>{stats.totalVariance.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Variance</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items Counted</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
            <Text style={styles.statValue}>{stats.openSessions}</Text>
            <Text style={styles.statLabel}>Open Sessions</Text>
          </View>
        </View>

        {/* Recent Sessions */}
        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading sessions...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No sessions found</Text>
              <Text style={styles.emptySubtext}>Start a new session to see it here</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionCard,
                  selectedSessions.has(session.id) && styles.sessionCardSelected,
                  Math.abs(session.total_variance) > 1000 && styles.sessionCardHighRisk,
                ]}
                onPress={() => router.push(`/supervisor/session/${session.id}`)}
                onLongPress={() => toggleSessionSelection(session.id)}
              >
                <View style={styles.sessionRow}>
                  {selectedSessions.size > 0 && (
                    <View style={styles.sessionCheckbox}>
                      <Ionicons
                        name={selectedSessions.has(session.id) ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selectedSessions.has(session.id) ? '#4CAF50' : '#888'}
                      />
                    </View>
                  )}
                  <View style={styles.sessionContent}>
                    <View style={styles.sessionHeader}>
                      <View>
                        <Text style={styles.sessionWarehouse}>{session.warehouse}</Text>
                        <Text style={styles.sessionStaff}>
                          Staff: {session.staff_name || 'Unknown'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              session.status === 'OPEN'
                                ? '#FF9800'
                                : session.status === 'CLOSED'
                                ? '#4CAF50'
                                : '#2196F3',
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>{session.status}</Text>
                      </View>
                    </View>

                    <Text style={styles.sessionDate}>
                      Started: {new Date(session.started_at).toLocaleDateString()}
                    </Text>

                    <View style={styles.sessionStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="cube-outline" size={16} color="#888" />
                        <Text style={styles.statText}>{session.total_items} items</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="analytics-outline" size={16} color="#888" />
                        <Text
                          style={[
                            styles.statText,
                            Math.abs(session.total_variance) > 0 && styles.varianceText,
                          ]}
                        >
                          Var: {session.total_variance}
                        </Text>
                      </View>
                      {Math.abs(session.total_variance) > 1000 && (
                        <View style={styles.statItem}>
                          <Ionicons name="warning" size={16} color="#FF5252" />
                          <Text style={styles.highRiskText}>High Risk</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* MRP Update Modal */}
      <Modal
        visible={showMRPModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMRPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mrpModalContainer}>
            <View style={styles.mrpModalHeader}>
              <Text style={styles.mrpModalTitle}>Update MRP</Text>
              <TouchableOpacity onPress={() => setShowMRPModal(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.mrpSearchContainer}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.mrpSearchInput}
                placeholder="Search item by name or code..."
                placeholderTextColor="#888"
                value={mrpSearchQuery}
                onChangeText={setMrpSearchQuery}
                onSubmitEditing={handleSearchMRP}
              />
              <TouchableOpacity onPress={handleSearchMRP}>
                <Ionicons name="arrow-forward-circle" size={28} color="#4CAF50" />
              </TouchableOpacity>
            </View>

            {mrpLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
              <>
                {!selectedItemForMRP ? (
                  <ScrollView style={styles.mrpSearchResults}>
                    {mrpSearchResults.map((item) => (
                      <TouchableOpacity
                        key={item.item_code}
                        style={styles.mrpSearchResultItem}
                        onPress={() => setSelectedItemForMRP(item)}
                      >
                        <View style={styles.mrpResultContent}>
                          <Text style={styles.mrpResultName}>{item.item_name}</Text>
                          <Text style={styles.mrpResultCode}>{item.item_code}</Text>
                          <Text style={styles.mrpResultBarcode}>{item.barcode}</Text>
                          <Text style={styles.mrpResultMRP}>Current MRP: ₹{item.mrp}</Text>
                        </View>
                        <Ionicons name="create-outline" size={24} color="#4CAF50" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View>
                    <View style={styles.selectedItemCard}>
                      <Text style={styles.selectedItemName}>{selectedItemForMRP.item_name}</Text>
                      <Text style={styles.selectedItemCode}>{selectedItemForMRP.item_code}</Text>
                      <Text style={styles.selectedItemBarcode}>{selectedItemForMRP.barcode}</Text>
                      <Text style={styles.selectedItemCurrentMRP}>
                        Current MRP: ₹{selectedItemForMRP.mrp}
                      </Text>
                    </View>

                    <Text style={styles.mrpInputLabel}>New MRP</Text>
                    <TextInput
                      style={styles.mrpInput}
                      placeholder="Enter new MRP"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      value={newMRP}
                      onChangeText={setNewMRP}
                    />

                    <View style={styles.mrpButtonContainer}>
                      <TouchableOpacity
                        style={styles.mrpCancelButton}
                        onPress={() => setSelectedItemForMRP(null)}
                      >
                        <Text style={styles.mrpCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.mrpUpdateButton,
                          isMRPUpdating && styles.mrpUpdateButtonDisabled,
                        ]}
                        onPress={updateItemMRP}
                        disabled={isMRPUpdating}
                      >
                        {isMRPUpdating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.mrpUpdateButtonText}>Update MRP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Sessions</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChipContainer}>
                {['ALL', 'OPEN', 'CLOSED', 'RECONCILE'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                    onPress={() => setFilterStatus(status as any)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Options */}
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterChipContainer}>
                {[
                  { key: 'date', label: 'Date', icon: 'calendar-outline' },
                  { key: 'variance', label: 'Variance', icon: 'analytics-outline' },
                  { key: 'items', label: 'Items', icon: 'cube-outline' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, sortBy === option.key && styles.filterChipActive]}
                    onPress={() => setSortBy(option.key as any)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={16}
                      color={sortBy === option.key ? '#fff' : '#888'}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === option.key && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Order */}
              <View style={styles.sortOrderContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortOrderButton,
                    sortOrder === 'asc' && styles.sortOrderButtonActive,
                  ]}
                  onPress={() => setSortOrder('asc')}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={sortOrder === 'asc' ? '#fff' : '#888'}
                  />
                  <Text
                    style={[
                      styles.sortOrderText,
                      sortOrder === 'asc' && styles.sortOrderTextActive,
                    ]}
                  >
                    Ascending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortOrderButton,
                    sortOrder === 'desc' && styles.sortOrderButtonActive,
                  ]}
                  onPress={() => setSortOrder('desc')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={sortOrder === 'desc' ? '#fff' : '#888'}
                  />
                  <Text
                    style={[
                      styles.sortOrderText,
                      sortOrder === 'desc' && styles.sortOrderTextActive,
                    ]}
                  >
                    Descending
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filter Stats */}
              <View style={styles.filterStatsContainer}>
                <Text style={styles.filterStatsText}>
                  {sessions.length} sessions match your filters
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setFilterStatus('ALL');
                  setSortBy('date');
                  setSortOrder('desc');
                }}
              >
                <Text style={styles.clearFilterButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFilterButton}
                onPress={() => {
                  setShowFilterModal(false);
                  loadData(1);
                }}
              >
                <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        visible={showAnalyticsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnalyticsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.analyticsModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Analytics Dashboard</Text>
              <TouchableOpacity onPress={() => setShowAnalyticsModal(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
              </TouchableOpacity>
            </View>

            {analyticsLoading ? (
              <View style={styles.analyticsLoadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.analyticsLoadingText}>Loading analytics...</Text>
              </View>
            ) : analyticsData ? (
              <ScrollView style={styles.modalScrollContent}>
                {/* Enhanced Stats Grid */}
                <Text style={styles.analyticsSectionTitle}>Comprehensive Statistics</Text>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="folder-outline" size={24} color="#4CAF50" />
                    <Text style={styles.analyticsValue}>{stats.totalSessions}</Text>
                    <Text style={styles.analyticsLabel}>Total Sessions</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="time-outline" size={24} color="#FF9800" />
                    <Text style={styles.analyticsValue}>{stats.openSessions}</Text>
                    <Text style={styles.analyticsLabel}>Open</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="checkmark-done-outline" size={24} color="#4CAF50" />
                    <Text style={styles.analyticsValue}>{stats.closedSessions}</Text>
                    <Text style={styles.analyticsLabel}>Closed</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#2196F3" />
                    <Text style={styles.analyticsValue}>{stats.reconciledSessions}</Text>
                    <Text style={styles.analyticsLabel}>Reconciled</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="cube-outline" size={24} color="#2196F3" />
                    <Text style={styles.analyticsValue}>{stats.totalItems}</Text>
                    <Text style={styles.analyticsLabel}>Items Counted</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="analytics-outline" size={24} color="#FF5252" />
                    <Text style={styles.analyticsValue}>{stats.totalVariance.toFixed(0)}</Text>
                    <Text style={styles.analyticsLabel}>Total Variance</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
                    <Text style={styles.analyticsValue}>{stats.positiveVariance}</Text>
                    <Text style={styles.analyticsLabel}>Positive Var.</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="trending-down-outline" size={24} color="#FF5252" />
                    <Text style={styles.analyticsValue}>{stats.negativeVariance}</Text>
                    <Text style={styles.analyticsLabel}>Negative Var.</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="calculator-outline" size={24} color="#FFC107" />
                    <Text style={styles.analyticsValue}>
                      {stats.avgVariancePerSession.toFixed(1)}
                    </Text>
                    <Text style={styles.analyticsLabel}>Avg. Variance</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Ionicons name="warning-outline" size={24} color="#FF5252" />
                    <Text style={styles.analyticsValue}>{stats.highRiskSessions}</Text>
                    <Text style={styles.analyticsLabel}>High Risk</Text>
                  </View>
                </View>

                {/* Variance by Warehouse */}
                <Text style={styles.analyticsSectionTitle}>Variance by Warehouse</Text>
                <View style={styles.analyticsListContainer}>
                  {Object.entries(analyticsData.varianceByWarehouse || {}).map(
                    ([warehouse, variance]: [string, any]) => (
                      <View key={warehouse} style={styles.analyticsListItem}>
                        <View style={styles.analyticsListLeft}>
                          <Ionicons name="business-outline" size={20} color="#4CAF50" />
                          <Text style={styles.analyticsListText}>{warehouse}</Text>
                        </View>
                        <Text
                          style={[
                            styles.analyticsListValue,
                            variance > 100 && styles.analyticsListValueHigh,
                          ]}
                        >
                          {variance.toFixed(0)}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                {/* Items by Staff */}
                <Text style={styles.analyticsSectionTitle}>Items Counted by Staff</Text>
                <View style={styles.analyticsListContainer}>
                  {Object.entries(analyticsData.itemsByStaff || {}).map(
                    ([staff, items]: [string, any]) => (
                      <View key={staff} style={styles.analyticsListItem}>
                        <View style={styles.analyticsListLeft}>
                          <Ionicons name="person-outline" size={20} color="#2196F3" />
                          <Text style={styles.analyticsListText}>{staff}</Text>
                        </View>
                        <Text style={styles.analyticsListValue}>{items}</Text>
                      </View>
                    )
                  )}
                </View>

                {/* Sessions by Date */}
                <Text style={styles.analyticsSectionTitle}>Sessions by Date</Text>
                <View style={styles.analyticsListContainer}>
                  {Object.entries(analyticsData.sessionsByDate || {})
                    .slice(0, 10)
                    .map(([date, count]: [string, any]) => (
                      <View key={date} style={styles.analyticsListItem}>
                        <View style={styles.analyticsListLeft}>
                          <Ionicons name="calendar-outline" size={20} color="#FFC107" />
                          <Text style={styles.analyticsListText}>{date}</Text>
                        </View>
                        <Text style={styles.analyticsListValue}>{count}</Text>
                      </View>
                    ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Bulk Operations Modal */}
      <Modal
        visible={showBulkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBulkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Operations</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.bulkStatsContainer}>
              <Text style={styles.bulkStatsText}>{selectedSessions.size} session(s) selected</Text>
              <View style={styles.bulkQuickActions}>
                <TouchableOpacity style={styles.bulkQuickButton} onPress={selectAllSessions}>
                  <Ionicons name="checkbox-outline" size={20} color="#4CAF50" />
                  <Text style={styles.bulkQuickButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bulkQuickButton} onPress={clearSelection}>
                  <Ionicons name="close-outline" size={20} color="#FF5252" />
                  <Text style={styles.bulkQuickButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.bulkSectionTitle}>Available Operations</Text>

              <TouchableOpacity
                style={styles.bulkOperationCard}
                onPress={() => handleBulkOperation('close')}
                disabled={selectedSessions.size === 0}
              >
                <View style={styles.bulkOperationIcon}>
                  <Ionicons name="lock-closed-outline" size={32} color="#FF9800" />
                </View>
                <View style={styles.bulkOperationContent}>
                  <Text style={styles.bulkOperationTitle}>Close Sessions</Text>
                  <Text style={styles.bulkOperationDescription}>
                    Mark selected sessions as closed. No further counting allowed.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkOperationCard}
                onPress={() => handleBulkOperation('reconcile')}
                disabled={selectedSessions.size === 0}
              >
                <View style={styles.bulkOperationIcon}>
                  <Ionicons name="checkmark-done-outline" size={32} color="#4CAF50" />
                </View>
                <View style={styles.bulkOperationContent}>
                  <Text style={styles.bulkOperationTitle}>Reconcile Sessions</Text>
                  <Text style={styles.bulkOperationDescription}>
                    Mark selected sessions as reconciled and finalized.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkOperationCard}
                onPress={() => handleBulkOperation('export')}
                disabled={selectedSessions.size === 0}
              >
                <View style={styles.bulkOperationIcon}>
                  <Ionicons name="download-outline" size={32} color="#2196F3" />
                </View>
                <View style={styles.bulkOperationContent}>
                  <Text style={styles.bulkOperationTitle}>Export Sessions</Text>
                  <Text style={styles.bulkOperationDescription}>
                    Export selected sessions data to Excel format.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </TouchableOpacity>

              {/* Session Selection List */}
              <Text style={styles.bulkSectionTitle}>Selected Sessions</Text>
              {selectedSessions.size === 0 ? (
                <View style={styles.bulkEmptyContainer}>
                  <Ionicons name="checkbox-outline" size={48} color="#555" />
                  <Text style={styles.bulkEmptyText}>No sessions selected</Text>
                  <Text style={styles.bulkEmptySubtext}>
                    Select sessions from the list to perform bulk operations
                  </Text>
                </View>
              ) : (
                <View style={styles.bulkSelectedList}>
                  {Array.from(selectedSessions).map((sessionId) => {
                    const session = sessions.find((s: any) => s.id === sessionId) as any;
                    if (!session) return null;
                    return (
                      <View key={sessionId} style={styles.bulkSelectedItem}>
                        <View style={styles.bulkSelectedItemContent}>
                          <Text style={styles.bulkSelectedItemTitle}>
                            {session.warehouse || 'N/A'}
                          </Text>
                          <Text style={styles.bulkSelectedItemSubtitle}>
                            {session.started_at
                              ? new Date(session.started_at).toLocaleDateString()
                              : 'N/A'}{' '}
                            • {session.status || 'N/A'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => toggleSessionSelection(sessionId)}>
                          <Ionicons name="close-circle" size={24} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SupervisorLayout>
  );
}

const styles = StyleSheet.create({
  headerExtension: {
    backgroundColor: '#1E1E1E',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  onlineStatusContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickActionsScroll: {
    flexGrow: 0,
    paddingHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: '#FF5252',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#121212',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  sessionsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sessionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionCardSelected: {
    borderColor: '#00E676',
    borderWidth: 2,
    backgroundColor: '#2d3a2d',
  },
  sessionCardHighRisk: {
    borderColor: '#FF5252',
    backgroundColor: '#3a2d2d',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sessionCheckbox: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  sessionContent: {
    flex: 1,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionWarehouse: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sessionStaff: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#888',
  },
  varianceText: {
    color: '#FF5252',
    fontWeight: 'bold',
  },
  highRiskText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mrpModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  mrpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mrpModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  mrpSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  mrpSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  mrpSearchResults: {
    maxHeight: 400,
  },
  mrpSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  mrpResultContent: {
    flex: 1,
  },
  mrpResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  mrpResultCode: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  mrpResultBarcode: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  mrpResultMRP: {
    fontSize: 14,
    color: '#FFC107',
    fontWeight: '600',
    marginTop: 4,
  },
  selectedItemCard: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  selectedItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  selectedItemCode: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  selectedItemBarcode: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  selectedItemCurrentMRP: {
    fontSize: 16,
    color: '#FFC107',
    fontWeight: '600',
    marginTop: 8,
  },
  mrpInputLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  mrpInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 20,
  },
  mrpButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mrpCancelButton: {
    flex: 1,
    backgroundColor: '#555',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mrpCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mrpUpdateButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mrpUpdateButtonDisabled: {
    backgroundColor: '#555',
  },
  mrpUpdateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalScrollContent: {
    maxHeight: 500,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  filterChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  sortOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  sortOrderButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sortOrderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  sortOrderTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterStatsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  filterStatsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearFilterButton: {
    flex: 1,
    backgroundColor: '#555',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFilterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyFilterButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFilterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Analytics Modal Styles
  analyticsModalContainer: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  analyticsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  analyticsLoadingText: {
    color: '#888',
    fontSize: 16,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    width: (Dimensions.get('window').width * 0.85 - 60) / 2, // Two columns with gaps
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  analyticsListContainer: {
    gap: 8,
  },
  analyticsListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  analyticsListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  analyticsListText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  analyticsListValue: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  analyticsListValueHigh: {
    color: '#FF5252',
  },
  // Bulk Operations Modal Styles
  bulkModalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  bulkStatsContainer: {
    marginBottom: 20,
  },
  bulkStatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bulkQuickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkQuickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  bulkQuickButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bulkSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 16,
  },
  bulkOperationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  bulkOperationIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444',
    borderRadius: 25,
  },
  bulkOperationContent: {
    flex: 1,
  },
  bulkOperationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bulkOperationDescription: {
    fontSize: 13,
    color: '#888',
  },
  bulkEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  bulkEmptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  bulkEmptySubtext: {
    color: '#666',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  bulkSelectedList: {
    gap: 8,
  },
  bulkSelectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  bulkSelectedItemContent: {
    flex: 1,
  },
  bulkSelectedItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  bulkSelectedItemSubtitle: {
    color: '#888',
    fontSize: 13,
  },
});
