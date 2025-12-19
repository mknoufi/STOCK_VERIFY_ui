import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePermissions } from '../../hooks/usePermissions';
import {
  getSyncConflicts,
  resolveSyncConflict,
  batchResolveSyncConflicts,
  getSyncConflictStats,
} from '../../services/api';

interface SyncConflict {
  _id: string;
  session_id: string;
  item_code: string;
  conflict_type: string;
  local_value: any;
  server_value: any;
  status: string;
  detected_at: string;
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export default function SyncConflictsScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    if (!hasPermission('sync.resolve_conflict')) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to resolve sync conflicts.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    loadConflicts();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const response = await getSyncConflicts(status);
      setConflicts(response.data?.conflicts || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load sync conflicts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getSyncConflictStats();
      setStats(response.data);
    } catch (error: any) {
      console.error('Failed to load conflict stats:', error);
    }
  };

  const handleResolve = async (conflictId: string, resolution: string) => {
    try {
      await resolveSyncConflict(conflictId, resolution, resolutionNote);
      Alert.alert('Success', 'Conflict resolved successfully');
      setModalVisible(false);
      setSelectedConflict(null);
      setResolutionNote('');
      loadConflicts();
      loadStats();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resolve conflict');
    }
  };

  const handleBatchResolve = async (resolution: string) => {
    if (selectedConflicts.size === 0) {
      Alert.alert('Error', 'Please select conflicts to resolve');
      return;
    }

    Alert.alert(
      'Confirm Batch Resolution',
      `Resolve ${selectedConflicts.size} conflicts with "${resolution}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await batchResolveSyncConflicts(
                Array.from(selectedConflicts),
                resolution,
                resolutionNote
              );
              Alert.alert('Success', 'Conflicts resolved successfully');
              setSelectedConflicts(new Set());
              setResolutionNote('');
              loadConflicts();
              loadStats();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to resolve conflicts');
            }
          },
        },
      ]
    );
  };

  const toggleConflictSelection = (conflictId: string) => {
    const newSelection = new Set(selectedConflicts);
    if (newSelection.has(conflictId)) {
      newSelection.delete(conflictId);
    } else {
      newSelection.add(conflictId);
    }
    setSelectedConflicts(newSelection);
  };

  const openConflictDetail = (conflict: SyncConflict) => {
    setSelectedConflict(conflict);
    setModalVisible(true);
  };

  const renderConflictCard = (conflict: SyncConflict) => {
    const isSelected = selectedConflicts.has(conflict._id);

    return (
      <TouchableOpacity
        key={conflict._id}
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => toggleConflictSelection(conflict._id)}
        onLongPress={() => openConflictDetail(conflict)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.checkbox}>
            {isSelected && <View style={styles.checkboxChecked} />}
          </View>
          <Text style={styles.itemCode}>{conflict.item_code}</Text>
          <Text style={styles.conflictType}>{conflict.conflict_type}</Text>
        </View>

        <View style={styles.conflictData}>
          <View style={styles.dataColumn}>
            <Text style={styles.dataLabel}>Local Value:</Text>
            <Text style={styles.dataValue}>
              {JSON.stringify(conflict.local_value)}
            </Text>
          </View>
          <View style={styles.dataColumn}>
            <Text style={styles.dataLabel}>Server Value:</Text>
            <Text style={styles.dataValue}>
              {JSON.stringify(conflict.server_value)}
            </Text>
          </View>
        </View>

        <Text style={styles.timestamp}>
          Detected: {new Date(conflict.detected_at).toLocaleString()}
        </Text>

        {conflict.status !== 'pending' && (
          <View style={styles.resolvedInfo}>
            <Text style={styles.resolvedText}>
              Resolved: {conflict.resolution} by {conflict.resolved_by}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conflicts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sync Conflicts</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadConflicts}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFC107' }]}>
              {stats.pending || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#00E676' }]}>
              {stats.resolved || 0}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      <View style={styles.filterBar}>
        {['pending', 'resolved', 'all'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedConflicts.size > 0 && (
        <View style={styles.batchActions}>
          <Text style={styles.batchText}>
            {selectedConflicts.size} selected
          </Text>
          <TouchableOpacity
            style={[styles.batchButton, { backgroundColor: '#00E676' }]}
            onPress={() => handleBatchResolve('accept_server')}
          >
            <Text style={styles.batchButtonText}>Accept Server</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchButton, { backgroundColor: '#007AFF' }]}
            onPress={() => handleBatchResolve('accept_local')}
          >
            <Text style={styles.batchButtonText}>Accept Local</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {conflicts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No sync conflicts found</Text>
            <Text style={styles.emptyStateSubtext}>
              Conflicts will appear here when they are detected
            </Text>
          </View>
        ) : (
          conflicts.map(renderConflictCard)
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Conflict</Text>

            {selectedConflict && (
              <>
                <Text style={styles.modalLabel}>Item: {selectedConflict.item_code}</Text>
                <Text style={styles.modalLabel}>Type: {selectedConflict.conflict_type}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Local Value:</Text>
                  <Text style={styles.modalValue}>
                    {JSON.stringify(selectedConflict.local_value, null, 2)}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Server Value:</Text>
                  <Text style={styles.modalValue}>
                    {JSON.stringify(selectedConflict.server_value, null, 2)}
                  </Text>
                </View>

                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Resolution note (optional)"
                  placeholderTextColor="#666"
                  value={resolutionNote}
                  onChangeText={setResolutionNote}
                  multiline
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#00E676' }]}
                    onPress={() => handleResolve(selectedConflict._id, 'accept_server')}
                  >
                    <Text style={styles.modalButtonText}>Accept Server</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                    onPress={() => handleResolve(selectedConflict._id, 'accept_local')}
                  >
                    <Text style={styles.modalButtonText}>Accept Local</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
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
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 24,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#252525',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  batchText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  batchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#444',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  cardSelected: {
    borderColor: '#007AFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
  itemCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  conflictType: {
    fontSize: 12,
    color: '#FFC107',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  conflictData: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dataColumn: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#252525',
    padding: 8,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  resolvedInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 4,
  },
  resolvedText: {
    fontSize: 12,
    color: '#00E676',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#252525',
    padding: 12,
    borderRadius: 8,
  },
  modalInput: {
    backgroundColor: '#252525',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
