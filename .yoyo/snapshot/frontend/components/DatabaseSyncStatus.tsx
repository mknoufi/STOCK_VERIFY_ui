/**
 * Database Sync Status Component
 * Shows SQL Server connection status, ERP configuration, and sync status
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Card } from './Card';
import { Button } from './Button';
import { getDatabaseSyncStatus, testDatabaseConnection, DatabaseStatus, SyncStatus } from '../services/databaseStatusService';
import { useNetworkStore } from '../services/networkService';

// Types imported from databaseStatusService

export const DatabaseSyncStatus: React.FC<{
  onRefresh?: () => void;
  compact?: boolean;
}> = ({ onRefresh, compact = false }) => {
  const theme = useTheme();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await getDatabaseSyncStatus();
      setDbStatus(status.database);
      setSyncStatus(status.sync);
      setLastUpdate(status.lastUpdate);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await testDatabaseConnection();
      // Refresh status after test
      await loadStatus();
    } catch (error) {
      console.error('Error testing connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return theme.colors.success;
      case 'disconnected':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.disabled;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return 'checkmark-circle';
      case 'disconnected':
        return 'close-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: theme.colors.surface }]}
        onPress={handleRefresh}
      >
        <View style={styles.compactRow}>
          <Ionicons
            name={dbStatus?.connection_status === 'connected' ? 'server' : 'server-outline'}
            size={20}
            color={getStatusColor(dbStatus?.connection_status || 'not_configured')}
          />
          <Text style={[styles.compactText, { color: theme.colors.text }]}>
            DB: {dbStatus?.connection_status || 'Unknown'}
          </Text>
          {syncStatus && syncStatus.queuedOperations > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{syncStatus.queuedOperations}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (loading && !dbStatus) {
    return (
      <Card title="Database Status">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading status...
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Card title="Database Sync Status" style={styles.card}>
        {/* Database Connection Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              SQL Server Connection
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusIndicator}>
              <Ionicons
                name={getStatusIcon(dbStatus?.connection_status || 'not_configured')}
                size={24}
                color={getStatusColor(dbStatus?.connection_status || 'not_configured')}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(dbStatus?.connection_status || 'not_configured') },
                ]}
              >
                {dbStatus?.connection_status?.toUpperCase() || 'NOT CONFIGURED'}
              </Text>
            </View>
          </View>

          {dbStatus?.configured && (
            <View style={styles.infoContainer}>
              <InfoRow label="Host" value={dbStatus.host} />
              <InfoRow label="Database" value={dbStatus.database} />
              <InfoRow label="Auth Method" value={dbStatus.auth_method} />
              {dbStatus.last_check && (
                <InfoRow
                  label="Last Check"
                  value={new Date(dbStatus.last_check).toLocaleString()}
                />
              )}
            </View>
          )}

          {dbStatus?.error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {dbStatus.error}
              </Text>
            </View>
          )}

          {!dbStatus?.configured && (
            <View style={styles.notConfiguredContainer}>
              <Text style={[styles.notConfiguredText, { color: theme.colors.textSecondary }]}>
                SQL Server is not configured. Please configure it in Settings.
              </Text>
            </View>
          )}
        </View>

        {/* Sync Status */}
        {syncStatus && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sync" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Sync Status
              </Text>
            </View>

            <View style={styles.infoContainer}>
              <InfoRow
                label="Network"
                value={syncStatus.isOnline ? 'Online' : 'Offline'}
                icon={syncStatus.isOnline ? 'wifi' : 'wifi-outline'}
                iconColor={syncStatus.isOnline ? theme.colors.success : theme.colors.error}
              />
              <InfoRow label="Queued Operations" value={syncStatus.queuedOperations.toString()} />
              <InfoRow label="Cache Size" value={`${(syncStatus.cacheSize / 1024).toFixed(2)} KB`} />
              {syncStatus.lastSync && (
                <InfoRow
                  label="Last Sync"
                  value={new Date(syncStatus.lastSync).toLocaleString()}
                />
              )}
            </View>

            {syncStatus.queuedOperations > 0 && syncStatus.isOnline && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={16} color={theme.colors.warning} />
                <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                  {syncStatus.queuedOperations} operation(s) pending sync
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Test Connection"
            onPress={handleTestConnection}
            icon="flash"
            variant="outline"
            size="small"
            loading={loading}
            style={{ marginBottom: 8 }}
          />
          <Button
            title="Refresh Status"
            onPress={handleRefresh}
            icon="refresh"
            variant="outline"
            size="small"
            loading={refreshing}
            fullWidth
          />
        </View>

        {/* Last Update */}
        <Text style={[styles.lastUpdateText, { color: theme.colors.textSecondary }]}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      </Card>
    </ScrollView>
  );
};

interface InfoRowProps {
  label: string;
  value: string | undefined;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon, iconColor }) => {
  const theme = useTheme();
  if (!value) return null;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        {icon && <Ionicons name={icon} size={16} color={iconColor || theme.colors.textSecondary} />}
        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}:</Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    gap: 8,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#FF9800' + '20',
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
  notConfiguredContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#F5F5F5',
  },
  notConfiguredText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  lastUpdateText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  compactContainer: {
    padding: 12,
    borderRadius: 8,
    margin: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
