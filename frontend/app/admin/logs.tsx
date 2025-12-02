import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePermissions } from '../../hooks/usePermissions';
import { getServiceLogs } from '../../services/api';

const isWeb = Platform.OS === 'web';

export default function LogsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasRole } = usePermissions();
  const service = (params.service as string) || 'backend';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) {
      router.back();
      return;
    }
    loadLogs();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, filterLevel]);

  const loadLogs = async () => {
    try {
      setRefreshing(true);
      const response = await getServiceLogs(service, 200, filterLevel === 'ALL' ? undefined : filterLevel);
      if (response.success && response.data) {
        setLogs(response.data.logs || []);
      }
    } catch (error: any) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return '#f44336';
      case 'WARN':
      case 'WARNING':
        return '#FF9800';
      case 'INFO':
        return '#2196F3';
      case 'DEBUG':
        return '#9E9E9E';
      default:
        return '#aaa';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      return log.message?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Ionicons name="document-text" size={28} color="#fff" style={styles.titleIcon} />
          <Text style={styles.title}>{service.toUpperCase()} Logs</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadLogs}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.levelFilters}>
          {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelFilter,
                filterLevel === level && styles.levelFilterActive,
              ]}
              onPress={() => setFilterLevel(level)}
            >
              <Text
                style={[
                  styles.levelFilterText,
                  filterLevel === level && styles.levelFilterTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadLogs} tintColor="#007AFF" />
        }
      >
        {loading && logs.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No logs found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Logs will appear here when available'}
            </Text>
          </View>
        ) : (
          filteredLogs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <View style={[styles.logLevelBadge, { backgroundColor: getLevelColor(log.level) }]}>
                  <Text style={styles.logLevelText}>{log.level || 'INFO'}</Text>
                </View>
                <Text style={styles.logTimestamp}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                </Text>
              </View>
              <Text style={styles.logMessage}>{log.message || 'No message'}</Text>
            </View>
          ))
        )}
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
    padding: 32,
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
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }),
  },
  headerWeb: {
    paddingHorizontal: isWeb ? 32 : 16,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
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
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  filtersContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 10,
  },
  levelFilters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  levelFilterActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  levelFilterText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  levelFilterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#333',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logLevelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#666',
  },
  logMessage: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
