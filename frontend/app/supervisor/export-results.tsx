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
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePermissions } from '../../src/hooks/usePermissions';
import { getExportResults, downloadExportResult } from '../../src/services/api/api';


interface ExportResult {
  _id: string;
  schedule_id: string;
  schedule_name: string;
  status: string;
  format: string;
  file_path?: string;
  file_size?: number;
  record_count?: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export default function ExportResultsScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission('export.view_all') && !hasPermission('export.view_own')) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to view export results.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const response = await getExportResults(undefined, status);
      setResults(response.data?.results || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load export results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resultId: string, fileName: string) => {
    try {
      setDownloading(resultId);
      const blob = await downloadExportResult(resultId);

      // For web: Create download link
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'File downloaded successfully');
      } else {
        // For mobile: Show message that download is in progress
        Alert.alert('Download', 'Export download feature requires expo-file-system configuration');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download export');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#00E676';
      case 'failed':
        return '#FF5252';
      case 'pending':
        return '#FFC107';
      default:
        return '#666';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const renderResultCard = (result: ExportResult) => (
    <View key={result._id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{result.schedule_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
          <Text style={styles.statusText}>{result.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.detailText}>Format: {result.format.toUpperCase()}</Text>
        {result.record_count !== undefined && (
          <Text style={styles.detailText}>Records: {result.record_count.toLocaleString()}</Text>
        )}
        {result.file_size && (
          <Text style={styles.detailText}>Size: {formatFileSize(result.file_size)}</Text>
        )}
        <Text style={styles.detailText}>
          Started: {new Date(result.started_at).toLocaleString()}
        </Text>
        {result.completed_at && (
          <Text style={styles.detailText}>
            Completed: {new Date(result.completed_at).toLocaleString()}
          </Text>
        )}
      </View>

      {result.error_message && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {result.error_message}</Text>
        </View>
      )}

      {result.status === 'completed' && result.file_path && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() =>
            handleDownload(
              result._id,
              `export_${result.schedule_name}_${new Date().getTime()}.${result.format}`
            )
          }
          disabled={downloading === result._id}
        >
          {downloading === result._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>⬇ Download</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading export results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Export Results</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadResults}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        {['all', 'completed', 'failed', 'pending'].map((status) => (
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

      <ScrollView style={styles.content}>
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No export results found</Text>
            <Text style={styles.emptyStateSubtext}>
              Exports will appear here when they complete
            </Text>
          </View>
        ) : (
          results.map(renderResultCard)
        )}
      </ScrollView>
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
    backgroundColor: '#1E1E1E',
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
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#f443361a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
  },
  downloadButton: {
    backgroundColor: '#00E676',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
