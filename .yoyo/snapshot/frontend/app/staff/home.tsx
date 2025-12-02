import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { createSession } from '../../services/api';
import { StatusBar } from 'expo-status-bar';
import { Pagination } from '../../components/Pagination';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { StaffLayout } from '../../components/layout/StaffLayout';
import { Section } from '../../components/layout/Section';
import { Container } from '../../components/layout/Container';
import { useTheme } from '../../hooks/useTheme';
import { colors } from '../../styles/globalStyles';
import { useSessionsQuery } from '../../hooks/useSessionsQuery';
import { SESSION_PAGE_SIZE } from '../../constants/config';
import { validateMRP, validateSessionName } from '../../utils/validation';
import { useStableDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { staffHomeStyles } from '../../styles/screens/StaffHome.styles';

export default function StaffHome() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [showWarehouseModal, setShowWarehouseModal] = React.useState(false);
  const [floorName, setFloorName] = React.useState('');
  const [rackName, setRackName] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // MRP Update Modal States
  const [showMRPModal, setShowMRPModal] = React.useState(false);
  const [mrpSearchQuery, setMrpSearchQuery] = React.useState('');
  const [mrpSearchResults, setMrpSearchResults] = React.useState<any[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [newMRP, setNewMRP] = React.useState('');
  const [isMRPSearching, setIsMRPSearching] = React.useState(false);
  const [isMRPUpdating, setIsMRPUpdating] = React.useState(false);
  const mrpSearchAbortRef = React.useRef<AbortController | null>(null);
  const styles = staffHomeStyles;
  const { data: sessionsData, isLoading: isLoadingSessions, isFetching, refetch } = useSessionsQuery({
    page: currentPage,
    pageSize: SESSION_PAGE_SIZE,
  });
  const sessions = sessionsData?.items || [];
  const pagination = sessionsData?.pagination;
  const isRefreshingSessions = isFetching && !isLoadingSessions;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNewSession = () => {
    setShowWarehouseModal(true);
    setFloorName('');
    setRackName('');
  };

  const handleCreateSession = async () => {
    const validation = validateSessionName(floorName, rackName);

    if (!validation.valid || !validation.value) {
      Alert.alert('Error', validation.error || 'Invalid session name');
      return;
    }

    try {
      setIsCreatingSession(true);
      setShowWarehouseModal(false);
      const session = await createSession(validation.value);
      setFloorName('');
      setRackName('');
      await refetch();
      router.push(`/staff/scan?sessionId=${session.id}`);
    } catch (error) {
      console.error('Create session error:', error);
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCancelModal = () => {
    setShowWarehouseModal(false);
    setFloorName('');
    setRackName('');
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    try {
      setIsLoggingOut(true);
      await logout();
      // Small delay to ensure state updates propagate
      setTimeout(() => {
        if (router.canGoBack()) {
          router.dismissAll();
        }
        router.replace('/login');
      }, 100);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even if logout fails
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // MRP Update Functions
  const searchItemsForMRP = React.useCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      if (mrpSearchAbortRef.current) {
        mrpSearchAbortRef.current.abort();
        mrpSearchAbortRef.current = null;
      }
      setMrpSearchResults([]);
      setIsMRPSearching(false);
      return;
    }

    if (mrpSearchAbortRef.current) {
      mrpSearchAbortRef.current.abort();
    }

    const controller = new AbortController();
    mrpSearchAbortRef.current = controller;

    try {
      setIsMRPSearching(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.18:5000'}/api/items/search?query=${encodeURIComponent(trimmedQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setMrpSearchResults(data.items || data || []);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('MRP Search error:', error);
      Alert.alert('Error', 'Failed to search items');
    } finally {
      if (mrpSearchAbortRef.current === controller) {
        mrpSearchAbortRef.current = null;
      }
      setIsMRPSearching(false);
    }
  }, []);

  const debouncedMrpSearch = useStableDebouncedCallback(searchItemsForMRP);

  const handleMRPSearch = (text: string) => {
    setMrpSearchQuery(text);
    debouncedMrpSearch(text);
  };

  const selectItemForMRP = (item: any) => {
    setSelectedItem(item);
    setNewMRP(item.mrp?.toString() || '');
    setMrpSearchQuery('');
    setMrpSearchResults([]);
  };

  React.useEffect(() => {
    return () => {
      if (mrpSearchAbortRef.current) {
        mrpSearchAbortRef.current.abort();
      }
      debouncedMrpSearch.cancel();
    };
  }, [debouncedMrpSearch]);

  const updateItemMRP = async () => {
    if (!selectedItem) {
      Alert.alert('Error', 'Please select an item');
      return;
    }

    const mrpValidation = validateMRP(newMRP);
    if (!mrpValidation.valid || mrpValidation.value === undefined) {
      Alert.alert('Error', mrpValidation.error || 'Please enter a valid MRP value');
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
          body: JSON.stringify({ mrp: mrpValidation.value }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update MRP');
      }

      Alert.alert(
        'Success',
        `MRP updated successfully!\n\nItem: ${selectedItem.item_name}\nOld MRP: ₹${selectedItem.mrp || 0}\nNew MRP: ₹${mrpValidation.value}`,
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
    const statusColor =
      item.status === 'OPEN'
        ? colors.success
        : item.status === 'RECONCILE'
          ? colors.warning
          : colors.textTertiary;

    return (
      <TouchableOpacity
        style={[styles.sessionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => router.push(`/staff/scan?sessionId=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionWarehouse, { color: theme.colors.text }]}>
            {item.warehouse}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.sessionDate, { color: theme.colors.textSecondary }]}>
          Started: {new Date(item.started_at).toLocaleString()}
        </Text>
        <View style={styles.sessionStats}>
          <Text style={[styles.sessionStat, { color: theme.colors.textSecondary }]}>
            Items: {item.total_items}
          </Text>
          <Text
            style={[
              styles.sessionStat,
              item.total_variance !== 0 && { color: colors.error, fontWeight: '600' },
            ]}
          >
            Variance: {item.total_variance}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <StaffLayout
      title="Sessions"
      headerActions={[
        {
          icon: 'help-circle-outline',
          label: 'Help',
          onPress: () => router.push('/help'),
        },
        {
          icon: 'log-out-outline',
          label: 'Logout',
          onPress: handleLogout,
        },
      ]}
    >
      <StatusBar style="light" />
      <Container>
        {/* Quick Actions */}
        <Section
          title={`Hello, ${user?.full_name || 'User'}`}
          subtitle="Staff Member"
          action={{
            label: 'Update MRP',
            icon: 'pricetag-outline',
            onPress: openMRPModal,
          }}
        >
          <View style={styles.quickActions}>
            <Button
              title="Start New Counting Session"
              onPress={handleNewSession}
              icon="add-circle-outline"
              size="large"
              fullWidth
              disabled={isLoadingSessions || isCreatingSession}
              loading={isCreatingSession}
            />
          </View>
        </Section>

        {/* Sessions List */}
        <Section title="Your Sessions">
          {isLoadingSessions && sessions.length === 0 ? (
            // Show skeleton loaders while loading
            <View style={styles.sessionsList}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.sessionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Skeleton width="70%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Skeleton width={80} height={14} borderRadius={4} />
                    <Skeleton width={100} height={14} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderSession}
              keyExtractor={(item: any) => item.id}
              contentContainerStyle={styles.sessionsList}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No sessions yet. Start a new one!
                </Text>
              }
              refreshing={isRefreshingSessions}
              onRefresh={() => refetch()}
              scrollEnabled={false} // Let parent Screen handle scrolling
            />
          )}
          {pagination && pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              totalItems={pagination.total}
              pageSize={pagination.page_size}
              onPageChange={handlePageChange}
              isLoading={isLoadingSessions || isFetching}
            />
          )}
        </Section>
      </Container>

      {/* New Session Modal */}
      <Modal
        visible={showWarehouseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCancelModal}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Session</Text>

                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                  Floor Name/Number:
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={floorName}
                  onChangeText={setFloorName}
                  placeholder="e.g., Floor 1"
                  placeholderTextColor={theme.colors.placeholder}
                  autoFocus={true}
                  returnKeyType="next"
                />

                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                  Rack Name/Number:
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  value={rackName}
                  onChangeText={setRackName}
                  placeholder="e.g., Rack A"
                  placeholderTextColor={theme.colors.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateSession}
                />

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={handleCancelModal}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Create"
                    onPress={handleCreateSession}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* MRP Update Modal */}
      <Modal
        visible={showMRPModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMRPModal(false)}
      >
        <View style={styles.mrpModalOverlay}>
          <View style={[styles.mrpModalContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.mrpModalHeader}>
              <Text style={[styles.mrpModalTitle, { color: theme.colors.text }]}>Update MRP</Text>
              <TouchableOpacity onPress={() => setShowMRPModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!selectedItem ? (
              <>
                <Text style={[styles.mrpModalSubtitle, { color: theme.colors.textSecondary }]}>
                  Search for an item
                </Text>
                <View
                  style={[
                    styles.mrpSearchContainer,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  ]}
                >
                  <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.mrpSearchInput, { color: theme.colors.text }]}
                    placeholder="Enter item name, code, or barcode"
                    placeholderTextColor={theme.colors.placeholder}
                    value={mrpSearchQuery}
                    onChangeText={handleMRPSearch}
                    autoFocus={true}
                  />
                  {isMRPSearching && <ActivityIndicator size="small" color={theme.colors.primary} />}
                </View>

                {mrpSearchResults.length > 0 && (
                  <ScrollView style={styles.mrpSearchResults}>
                    {mrpSearchResults.map((item, index) => (
                      <TouchableOpacity
                        key={`mrp-result-${index}-${item.item_code}`}
                        style={[
                          styles.mrpSearchResultItem,
                          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        ]}
                        onPress={() => selectItemForMRP(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.mrpResultContent}>
                          <Text style={[styles.mrpResultName, { color: theme.colors.text }]}>
                            {item.item_name}
                          </Text>
                          <Text style={[styles.mrpResultCode, { color: theme.colors.textSecondary }]}>
                            Code: {item.item_code}
                          </Text>
                          {item.barcode && (
                            <Text style={[styles.mrpResultBarcode, { color: theme.colors.textSecondary }]}>
                              Barcode: {item.barcode}
                            </Text>
                          )}
                          <Text style={[styles.mrpResultMRP, { color: colors.warning }]}>
                            Current MRP: ₹{item.mrp || 0}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.selectedItemCard,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
                  ]}
                >
                  <Text style={[styles.selectedItemName, { color: theme.colors.text }]}>
                    {selectedItem.item_name}
                  </Text>
                  <Text style={[styles.selectedItemCode, { color: theme.colors.textSecondary }]}>
                    Code: {selectedItem.item_code}
                  </Text>
                  {selectedItem.barcode && (
                    <Text style={[styles.selectedItemBarcode, { color: theme.colors.textSecondary }]}>
                      Barcode: {selectedItem.barcode}
                    </Text>
                  )}
                  <Text style={[styles.selectedItemCurrentMRP, { color: colors.warning }]}>
                    Current MRP: ₹{selectedItem.mrp || 0}
                  </Text>
                </View>

                <Text style={[styles.mrpInputLabel, { color: theme.colors.text }]}>New MRP (₹)</Text>
                <TextInput
                  style={[
                    styles.mrpInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Enter new MRP"
                  placeholderTextColor={theme.colors.placeholder}
                  value={newMRP}
                  onChangeText={setNewMRP}
                  keyboardType="decimal-pad"
                />

                <View style={styles.mrpButtonContainer}>
                  <Button
                    title="Change Item"
                    onPress={() => setSelectedItem(null)}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Update MRP"
                    onPress={updateItemMRP}
                    disabled={isMRPUpdating}
                    loading={isMRPUpdating}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </StaffLayout>
  );
}

