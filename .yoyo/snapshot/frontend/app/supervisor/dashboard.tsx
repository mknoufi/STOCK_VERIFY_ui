import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getSessions, bulkCloseSessions, bulkReconcileSessions, bulkExportSessions, getSessionsAnalytics } from '../../services/api';
import { StatusBar } from 'expo-status-bar';
import { Pagination } from '../../components/Pagination';
import { OnlineStatus } from '../../components/OnlineStatus';
import { useAutoLogout } from '../../hooks/useAutoLogout';
import { AppLogo } from '../../components/AppLogo';
import { flags } from '../../constants/flags';
import { getQueueCount } from '../../services/offlineQueue';

const { width } = Dimensions.get('window');

export default function SupervisorDashboard() {
  const [sessions, setSessions] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  // refreshing is used for pull-to-refresh (future feature)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    reconciledSessions: 0,
    totalVariance: 0,
    totalItems: 0,
    positiveVariance: 0,
    negativeVariance: 0,
    avgVariancePerSession: 0,
    highRiskSessions: 0,
  });

  // Filter States
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'date' | 'variance' | 'items'>('date');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Advanced Analytics States
  const [showAnalyticsModal, setShowAnalyticsModal] = React.useState(false);
  const [analyticsData, setAnalyticsData] = React.useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);

  // Bulk Operations States
  const [showBulkModal, setShowBulkModal] = React.useState(false);
  const [selectedSessions, setSelectedSessions] = React.useState<Set<string>>(new Set());

  // MRP Update Modal States
  const [showMRPModal, setShowMRPModal] = React.useState(false);
  const [mrpSearchQuery, setMrpSearchQuery] = React.useState('');
  const [mrpSearchResults, setMrpSearchResults] = React.useState<any[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [newMRP, setNewMRP] = React.useState('');
  const [isMRPSearching, setIsMRPSearching] = React.useState(false);
  const [isMRPUpdating, setIsMRPUpdating] = React.useState(false);

  const router = useRouter();
  const { user } = useAuthStore();
  const { resetTimer } = useAutoLogout(true);
  const [queuedCount, setQueuedCount] = React.useState<number>(0);

  React.useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  // Poll queued count for badge when offline queue is enabled
  React.useEffect(() => {
    if (!flags.enableOfflineQueue) return;
    let mounted = true;
    const tick = async () => {
      try {
        const q = await getQueueCount();
        if (mounted) setQueuedCount(q);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Reset auto-logout timer on any interaction
  const handleInteraction = () => {
    resetTimer();
  };

  const loadData = async (page: number = 1, showRefresh: boolean = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result = await getSessions(page, 20);
      const sessionItems = result.items || [];
      setSessions(sessionItems);
      setPagination(result.pagination || null);

      // Load all sessions for comprehensive stats
      if (page === 1 || showRefresh) {
        const allResult = await getSessions(1, 10000); // Get all for stats
        const allItems = allResult.items || [];

        // Calculate comprehensive stats
        const openCount = allItems.filter((s: any) => s.status === 'OPEN').length;
        const closedCount = allItems.filter((s: any) => s.status === 'CLOSED').length;
        const reconciledCount = allItems.filter((s: any) => s.status === 'RECONCILE').length;
        const totalItems = allItems.reduce((sum: number, s: any) => sum + (s.total_items || 0), 0);
        const totalVar = allItems.reduce((sum: number, s: any) => sum + (s.total_variance || 0), 0);
        const positiveVar = allItems.reduce((sum: number, s: any) => {
          const variance = s.total_variance || 0;
          return sum + (variance > 0 ? variance : 0);
        }, 0);
        const negativeVar = allItems.reduce((sum: number, s: any) => {
          const variance = s.total_variance || 0;
          return sum + (variance < 0 ? Math.abs(variance) : 0);
        }, 0);
        const highRisk = allItems.filter((s: any) => Math.abs(s.total_variance || 0) > 100).length;

        const calculatedStats = {
          totalSessions: allItems.length,
          openSessions: openCount,
          closedSessions: closedCount,
          reconciledSessions: reconciledCount,
          totalVariance: Math.abs(totalVar),
          totalItems: totalItems,
          positiveVariance: positiveVar,
          negativeVariance: negativeVar,
          avgVariancePerSession: allItems.length > 0 ? Math.abs(totalVar) / allItems.length : 0,
          highRiskSessions: highRisk,
        };
        setStats(calculatedStats);
      }
    } catch (error) {
      // Error logged via error handler
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Selection Management
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
    const allIds = new Set(sessions.map((s: any) => s.id));
    setSelectedSessions(allIds);
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  // Bulk Operations
  const handleBulkOperation = async (operation: 'close' | 'reconcile' | 'export') => {
    if (selectedSessions.size === 0) {
      Alert.alert('No Selection', 'Please select sessions first');
      return;
    }

    Alert.alert(
      'Confirm Bulk Operation',
      `${operation.toUpperCase()} ${selectedSessions.size} session(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              const sessionIds = Array.from(selectedSessions);

              let result;
              if (operation === 'export') {
                result = await bulkExportSessions(sessionIds, 'excel');
                Alert.alert('Success', `Exported ${result.exported_count} of ${sessionIds.length} sessions`);
              } else if (operation === 'close') {
                result = await bulkCloseSessions(sessionIds);
                Alert.alert('Success', `Closed ${result.updated_count} of ${sessionIds.length} sessions`);
              } else if (operation === 'reconcile') {
                result = await bulkReconcileSessions(sessionIds);
                Alert.alert('Success', `Reconciled ${result.updated_count} of ${sessionIds.length} sessions`);
              }

              if (result?.errors && result.errors.length > 0) {
                // Bulk operation errors handled
              }

              clearSelection();
              loadData(currentPage);
            } catch (error: any) {
              // Error logged via error handler
              Alert.alert('Error', error?.response?.data?.detail || 'Bulk operation failed');
            } finally {
              setLoading(false);
              setShowBulkModal(false);
            }
          },
        },
      ]
    );
  };

  // Advanced Analytics
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setShowAnalyticsModal(true);

      const result = await getSessionsAnalytics();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        Alert.alert('Error', 'Failed to load analytics');
      }
    } catch (error) {
      // Error logged via error handler
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // MRP Update Functions
  const searchItemsForMRP = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setMrpSearchResults([]);
      return;
    }

    try {
      setIsMRPSearching(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.18:5000'}/api/items/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setMrpSearchResults(data.items || data || []);
    } catch (error) {
      // Error logged via error handler
      Alert.alert('Error', 'Failed to search items');
    } finally {
      setIsMRPSearching(false);
    }
  };

  const handleMRPSearch = (text: string) => {
    setMrpSearchQuery(text);
    searchItemsForMRP(text);
  };

  const selectItemForMRP = (item: any) => {
    setSelectedItem(item);
    setNewMRP(item.mrp?.toString() || '');
    setMrpSearchQuery('');
    setMrpSearchResults([]);
  };

  const updateItemMRP = async () => {
    if (!selectedItem || !newMRP) {
      Alert.alert('Error', 'Please select an item and enter MRP');
      return;
    }

    const mrpValue = parseFloat(newMRP);
    if (isNaN(mrpValue) || mrpValue < 0) {
      Alert.alert('Error', 'Please enter a valid MRP value');
      return;
    }

    try {
      setIsMRPUpdating(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.18:5000'}/api/items/${selectedItem.item_code}/mrp`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mrp: mrpValue }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update MRP');
      }

      Alert.alert(
        'Success',
        `MRP updated successfully!\n\nItem: ${selectedItem.item_name}\nOld MRP: ₹${selectedItem.mrp || 0}\nNew MRP: ₹${mrpValue}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedItem(null);
              setNewMRP('');
              setShowMRPModal(false);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update MRP');
    } finally {
      setIsMRPUpdating(false);
    }
  };

  const openMRPModal = () => {
    setShowMRPModal(true);
    setSelectedItem(null);
    setNewMRP('');
    setMrpSearchQuery('');
    setMrpSearchResults([]);
  };


  const renderSession = ({ item }: any) => {
    const statusColor = item.status === 'OPEN' ? '#4CAF50' : item.status === 'RECONCILE' ? '#FF9800' : '#888';
    const isSelected = selectedSessions.has(item.id);
    const isHighRisk = Math.abs(item.total_variance || 0) > 100;

    return (
      <View style={[styles.sessionCard, isSelected && styles.sessionCardSelected, isHighRisk && styles.sessionCardHighRisk]}>
        <View style={styles.sessionRow}>
          {/* Selection Checkbox */}
          <TouchableOpacity
            onPress={() => toggleSessionSelection(item.id)}
            style={styles.sessionCheckbox}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={28}
              color={isSelected ? '#4CAF50' : '#888'}
            />
          </TouchableOpacity>

          {/* Session Content */}
          <TouchableOpacity
            style={styles.sessionContent}
            onPress={() => router.push(`/supervisor/session-detail?sessionId=${item.id}`)}
          >
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.sessionWarehouse}>{item.warehouse}</Text>
                <Text style={styles.sessionStaff}>by {item.staff_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.sessionDate}>
              {new Date(item.started_at).toLocaleString()}
            </Text>

            <View style={styles.sessionStats}>
              <View style={styles.statItem}>
                <Ionicons name="cube-outline" size={20} color="#888" />
                <Text style={styles.statText}>{item.total_items} items</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={20} color={(item.total_variance || 0) !== 0 ? '#FF5252' : '#888'} />
                <Text style={[styles.statText, (item.total_variance || 0) !== 0 && styles.varianceText]}>
                  Var: {(item.total_variance || 0).toFixed(2)}
                </Text>
              </View>
              {isHighRisk && (
                <View style={styles.statItem}>
                  <Ionicons name="warning" size={20} color="#FF5252" />
                  <Text style={styles.highRiskText}>High Risk</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Fixed Header */}
      <View style={styles.header}>
        {/* Logo and Title Row */}
        <View style={styles.logoRow}>
          <AppLogo size="medium" showText={true} variant="white" />
        </View>

        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.greeting}>Supervisor Dashboard</Text>
              <Text style={styles.role}>{user?.full_name}</Text>
            </View>
            <OnlineStatus />
          </View>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Confirm Logout',
                `${user?.full_name || 'User'}, are you sure you want to logout?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await useAuthStore.getState().logout();
                        // Use a slight delay to ensure state is cleared before navigation
                        setTimeout(() => {
                          router.replace('/login');
                        }, 100);
                      } catch (error) {
                        // Error logged via error handler
                        Alert.alert('Error', 'Failed to logout. Please try again.');
                      }
                    },
                  },
                ]
              );
            }}
            style={styles.logoutButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActions}
        >
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={[styles.actionButton, filterStatus !== 'ALL' && styles.actionButtonActive]}
            onPressIn={handleInteraction}
          >
            <Ionicons name="filter-outline" size={20} color={filterStatus !== 'ALL' ? "#4CAF50" : "#fff"} />
            <Text style={[styles.actionButtonText, filterStatus !== 'ALL' && styles.actionButtonTextActive]}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={loadAnalytics}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowBulkModal(true)}
            style={[styles.actionButton, selectedSessions.size > 0 && styles.actionButtonActive]}
            onPressIn={handleInteraction}
          >
            <Ionicons name="checkbox-outline" size={20} color={selectedSessions.size > 0 ? "#FF9800" : "#fff"} />
            <Text style={[styles.actionButtonText, selectedSessions.size > 0 && styles.actionButtonTextActive]}>
              Bulk {selectedSessions.size > 0 ? `(${selectedSessions.size})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/activity-logs')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="list-outline" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Logs</Text>
          </TouchableOpacity>
          {flags.enableNotes && (
            <TouchableOpacity
              onPress={() => router.push('/supervisor/notes' as Href)}
              style={styles.actionButton}
              onPressIn={handleInteraction}
            >
              <Ionicons name="book-outline" size={20} color="#00BCD4" />
              <Text style={styles.actionButtonText}>Notes</Text>
            </TouchableOpacity>
          )}
          {flags.enableOfflineQueue && (
            <TouchableOpacity
              onPress={() => router.push('/supervisor/offline-queue' as Href)}
              style={styles.actionButton}
              onPressIn={handleInteraction}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#00E676" />
              <Text style={styles.actionButtonText}>Offline</Text>
              {queuedCount > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{queuedCount > 99 ? '99+' : queuedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openMRPModal}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="pricetag-outline" size={20} color="#FFC107" />
            <Text style={styles.actionButtonText}>MRP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/export')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="download-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/export-schedules')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="calendar-outline" size={20} color="#9C27B0" />
            <Text style={styles.actionButtonText}>Schedules</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/export-results')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="archive-outline" size={20} color="#00BCD4" />
            <Text style={styles.actionButtonText}>Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/sync-conflicts')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="git-compare-outline" size={20} color="#FF5722" />
            <Text style={styles.actionButtonText}>Conflicts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/items')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="cube-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/supervisor/variances')}
            style={styles.actionButton}
            onPressIn={handleInteraction}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#FF5252" />
            <Text style={styles.actionButtonText}>Variances</Text>
          </TouchableOpacity>
          {user?.role === 'admin' && (
            <>
              <TouchableOpacity
                onPress={() => router.push('/admin/permissions')}
                style={styles.actionButton}
                onPressIn={handleInteraction}
              >
                <Ionicons name="key-outline" size={20} color="#E91E63" />
                <Text style={styles.actionButtonText}>Permissions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/admin/metrics')}
                style={styles.actionButton}
                onPressIn={handleInteraction}
              >
                <Ionicons name="speedometer-outline" size={20} color="#3F51B5" />
                <Text style={styles.actionButtonText}>Metrics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/supervisor/settings')}
                style={styles.actionButton}
                onPressIn={handleInteraction}
              >
                <Ionicons name="settings-outline" size={20} color="#607D8B" />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleInteraction}
        scrollEventThrottle={400}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPressIn={handleInteraction}
          >
            <Ionicons name="folder-outline" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPressIn={handleInteraction}
          >
            <Ionicons name="time-outline" size={32} color="#FF9800" />
            <Text style={styles.statValue}>{stats.openSessions}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPressIn={handleInteraction}
          >
            <Ionicons name="cube-outline" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Items Counted</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPressIn={handleInteraction}
          >
            <Ionicons name="analytics-outline" size={32} color="#FF5252" />
            <Text style={styles.statValue}>{stats.totalVariance.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Variance</Text>
          </TouchableOpacity>
        </View>

        {/* Sessions Section */}
        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity
              onPress={() => loadData(currentPage)}
              onPressIn={handleInteraction}
              disabled={loading}
            >
              <Ionicons
                name="refresh"
                size={24}
                color={loading ? "#555" : "#fff"}
              />
            </TouchableOpacity>
          </View>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              totalItems={pagination.total}
              pageSize={pagination.page_size}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          )}

          {/* Sessions List */}
          {loading && sessions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading sessions...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#555" />
              <Text style={styles.emptyText}>No sessions available</Text>
              <Text style={styles.emptySubtext}>Sessions will appear here when created</Text>
            </View>
          ) : (
            sessions.map((item: any, index: number) => (
              <View key={item.id || `session-${index}`}>
                {renderSession({ item })}
              </View>
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

            {!selectedItem ? (
              <>
                <Text style={styles.mrpModalSubtitle}>Search for an item</Text>
                <View style={styles.mrpSearchContainer}>
                  <Ionicons name="search" size={20} color="#888" />
                  <TextInput
                    style={styles.mrpSearchInput}
                    placeholder="Enter item name, code, or barcode"
                    placeholderTextColor="#666"
                    value={mrpSearchQuery}
                    onChangeText={handleMRPSearch}
                    autoFocus={true}
                  />
                  {isMRPSearching && <ActivityIndicator size="small" color="#4CAF50" />}
                </View>

                {mrpSearchResults.length > 0 && (
                  <ScrollView style={styles.mrpSearchResults}>
                    {mrpSearchResults.map((item, index) => (
                      <TouchableOpacity
                        key={`mrp-result-${index}-${item.item_code}`}
                        style={styles.mrpSearchResultItem}
                        onPress={() => selectItemForMRP(item)}
                      >
                        <View style={styles.mrpResultContent}>
                          <Text style={styles.mrpResultName}>{item.item_name}</Text>
                          <Text style={styles.mrpResultCode}>Code: {item.item_code}</Text>
                          {item.barcode && (
                            <Text style={styles.mrpResultBarcode}>Barcode: {item.barcode}</Text>
                          )}
                          <Text style={styles.mrpResultMRP}>Current MRP: ₹{item.mrp || 0}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#888" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.selectedItemCard}>
                  <Text style={styles.selectedItemName}>{selectedItem.item_name}</Text>
                  <Text style={styles.selectedItemCode}>Code: {selectedItem.item_code}</Text>
                  {selectedItem.barcode && (
                    <Text style={styles.selectedItemBarcode}>Barcode: {selectedItem.barcode}</Text>
                  )}
                  <Text style={styles.selectedItemCurrentMRP}>
                    Current MRP: ₹{selectedItem.mrp || 0}
                  </Text>
                </View>

                <Text style={styles.mrpInputLabel}>New MRP (₹)</Text>
                <TextInput
                  style={styles.mrpInput}
                  placeholder="Enter new MRP"
                  placeholderTextColor="#666"
                  value={newMRP}
                  onChangeText={setNewMRP}
                  keyboardType="decimal-pad"
                />

                <View style={styles.mrpButtonContainer}>
                  <TouchableOpacity
                    style={styles.mrpCancelButton}
                    onPress={() => setSelectedItem(null)}
                  >
                    <Text style={styles.mrpCancelButtonText}>Change Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mrpUpdateButton, isMRPUpdating && styles.mrpUpdateButtonDisabled]}
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
                    style={[
                      styles.filterChip,
                      filterStatus === status && styles.filterChipActive
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive
                    ]}>
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
                  { key: 'items', label: 'Items', icon: 'cube-outline' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterChip,
                      sortBy === option.key && styles.filterChipActive
                    ]}
                    onPress={() => setSortBy(option.key as any)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={16}
                      color={sortBy === option.key ? '#fff' : '#888'}
                    />
                    <Text style={[
                      styles.filterChipText,
                      sortBy === option.key && styles.filterChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Order */}
              <View style={styles.sortOrderContainer}>
                <TouchableOpacity
                  style={[styles.sortOrderButton, sortOrder === 'asc' && styles.sortOrderButtonActive]}
                  onPress={() => setSortOrder('asc')}
                >
                  <Ionicons name="arrow-up" size={20} color={sortOrder === 'asc' ? '#fff' : '#888'} />
                  <Text style={[styles.sortOrderText, sortOrder === 'asc' && styles.sortOrderTextActive]}>
                    Ascending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortOrderButton, sortOrder === 'desc' && styles.sortOrderButtonActive]}
                  onPress={() => setSortOrder('desc')}
                >
                  <Ionicons name="arrow-down" size={20} color={sortOrder === 'desc' ? '#fff' : '#888'} />
                  <Text style={[styles.sortOrderText, sortOrder === 'desc' && styles.sortOrderTextActive]}>
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
                    <Text style={styles.analyticsValue}>{stats.avgVariancePerSession.toFixed(1)}</Text>
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
                  {Object.entries(analyticsData.varianceByWarehouse || {}).map(([warehouse, variance]: [string, any]) => (
                    <View key={warehouse} style={styles.analyticsListItem}>
                      <View style={styles.analyticsListLeft}>
                        <Ionicons name="business-outline" size={20} color="#4CAF50" />
                        <Text style={styles.analyticsListText}>{warehouse}</Text>
                      </View>
                      <Text style={[styles.analyticsListValue, variance > 100 && styles.analyticsListValueHigh]}>
                        {variance.toFixed(0)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Items by Staff */}
                <Text style={styles.analyticsSectionTitle}>Items Counted by Staff</Text>
                <View style={styles.analyticsListContainer}>
                  {Object.entries(analyticsData.itemsByStaff || {}).map(([staff, items]: [string, any]) => (
                    <View key={staff} style={styles.analyticsListItem}>
                      <View style={styles.analyticsListLeft}>
                        <Ionicons name="person-outline" size={20} color="#2196F3" />
                        <Text style={styles.analyticsListText}>{staff}</Text>
                      </View>
                      <Text style={styles.analyticsListValue}>{items}</Text>
                    </View>
                  ))}
                </View>

                {/* Sessions by Date */}
                <Text style={styles.analyticsSectionTitle}>Sessions by Date</Text>
                <View style={styles.analyticsListContainer}>
                  {Object.entries(analyticsData.sessionsByDate || {}).slice(0, 10).map(([date, count]: [string, any]) => (
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
              <Text style={styles.bulkStatsText}>
                {selectedSessions.size} session(s) selected
              </Text>
              <View style={styles.bulkQuickActions}>
                <TouchableOpacity
                  style={styles.bulkQuickButton}
                  onPress={selectAllSessions}
                >
                  <Ionicons name="checkbox-outline" size={20} color="#4CAF50" />
                  <Text style={styles.bulkQuickButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkQuickButton}
                  onPress={clearSelection}
                >
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
                  <Text style={styles.bulkEmptySubtext}>Select sessions from the list to perform bulk operations</Text>
                </View>
              ) : (
                <View style={styles.bulkSelectedList}>
                  {Array.from(selectedSessions).map((sessionId) => {
                    const session = sessions.find((s: any) => s.id === sessionId) as any;
                    if (!session) return null;
                    return (
                      <View key={sessionId} style={styles.bulkSelectedItem}>
                        <View style={styles.bulkSelectedItemContent}>
                          <Text style={styles.bulkSelectedItemTitle}>{session.warehouse || 'N/A'}</Text>
                          <Text style={styles.bulkSelectedItemSubtitle}>
                            {session.started_at ? new Date(session.started_at).toLocaleDateString() : 'N/A'} • {session.status || 'N/A'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  logoRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  role: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
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
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
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
  mrpModalSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
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
    width: (width * 0.85 - 60) / 2, // Two columns with gaps
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
  quickActionsScroll: {
    flexGrow: 0,
  },
  actionButtonActive: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButtonTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
