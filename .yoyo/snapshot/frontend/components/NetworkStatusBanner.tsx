import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStore } from '../services/networkService';
import { getOfflineQueue, getCacheStats } from '../services/offlineStorage';
import { syncOfflineQueue } from '../services/api';

interface NetworkStatusBannerProps {
  onSyncPress?: () => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ onSyncPress }) => {
  const { isOnline, isInternetReachable } = useNetworkStore();
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    updateQueueCount();
  }, [isOnline]);

  const updateQueueCount = async () => {
    const queue = await getOfflineQueue();
    setQueueCount(queue.length);
  };

  const handleSync = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      const results = await syncOfflineQueue();
      await updateQueueCount();

      if (onSyncPress) {
        onSyncPress();
      }

      console.log('Sync completed:', results);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && isInternetReachable !== false && queueCount === 0) {
    return null; // Don't show banner when online and no pending items
  }

  return (
    <View
      style={[
        styles.banner,
        isOnline ? styles.bannerOnlineWithQueue : styles.bannerOffline,
      ]}
    >
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.indicator,
            isOnline ? styles.indicatorOnline : styles.indicatorOffline,
          ]}
        />
        <Text style={styles.statusText}>
          {isOnline
            ? queueCount > 0
              ? `${queueCount} pending items to sync`
              : 'Online'
            : 'Offline Mode - Data will sync when online'}
        </Text>
      </View>
      {isOnline && queueCount > 0 && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={syncing}
        >
          <Text style={styles.syncButtonText}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerOffline: {
    backgroundColor: '#FF6B6B',
  },
  bannerOnlineWithQueue: {
    backgroundColor: '#FFA500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorOnline: {
    backgroundColor: '#4CAF50',
  },
  indicatorOffline: {
    backgroundColor: '#FFF',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NetworkStatusBanner;
