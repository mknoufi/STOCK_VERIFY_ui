/**
 * Backup Service - Backup and restore functionality
 * Handles backing up and restoring app data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { getSessionsCache, getItemsCache, getCacheStats, clearAllCache } from './offline/offlineStorage';


interface BackupItem {
  id: string;
  [key: string]: unknown;
}

interface BackupSession {
  id: string;
  [key: string]: unknown;
}

interface BackupCountLine {
  id: string;
  [key: string]: unknown;
}

interface BackupPreferences {
  [key: string]: unknown;
}

interface BackupAnalytics {
  [key: string]: unknown;
}

export interface BackupData {
  version: string;
  timestamp: string;
  cache: {
    items: BackupItem[];
    sessions: BackupSession[];
    countLines: BackupCountLine[];
  };
  settings: {
    lastSync: string | null;
    preferences: BackupPreferences;
  };
  analytics: BackupAnalytics;
}

/**
 * Backup Service
 */
export class BackupService {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly STORAGE_KEYS = [
    'items_cache',
    'sessions_cache',
    'count_lines_cache',
    'offline_queue',
    'last_sync',
    'analytics_data',
    'favorite_items',
    'recent_items',
  ];

  /**
   * Create backup
   */
  static async createBackup(): Promise<BackupData> {
    try {
      const backup: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        cache: {
          items: [] as BackupItem[],
          sessions: [] as BackupSession[],
          countLines: [] as BackupCountLine[],
        },
        settings: {
          lastSync: null,
          preferences: {},
        },
        analytics: {},
      };

      // Backup cache data
      for (const key of this.STORAGE_KEYS) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            if (key === 'items_cache') {
              backup.cache.items = JSON.parse(data);
            } else if (key === 'sessions_cache') {
              backup.cache.sessions = JSON.parse(data);
            } else if (key === 'count_lines_cache') {
              backup.cache.countLines = JSON.parse(data);
            } else if (key === 'last_sync') {
              backup.settings.lastSync = data;
            } else if (key === 'analytics_data') {
              backup.analytics = JSON.parse(data);
            }
          }
        } catch (error) {
          __DEV__ && console.error(`Error backing up ${key}:`, error);
        }
      }

      return backup;
    } catch (error) {
      __DEV__ && console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Export backup to JSON
   */
  static async exportBackup(): Promise<string> {
    const backup = await this.createBackup();
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Share backup
   */
  static async shareBackup() {
    try {
      const backupJson = await this.exportBackup();
      const filename = `stock_count_backup_${new Date().toISOString().split('T')[0]}.json`;

      await Share.share({
        message: backupJson,
        title: filename,
      });
    } catch (error) {
      __DEV__ && console.error('Error sharing backup:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  static async restoreBackup(backupData: BackupData): Promise<void> {
    try {
      // Validate backup version
      if (backupData.version !== this.BACKUP_VERSION) {
        throw new Error('Backup version mismatch');
      }

      // Restore cache data
      if (backupData.cache.items) {
        await AsyncStorage.setItem('items_cache', JSON.stringify(backupData.cache.items));
      }

      if (backupData.cache.sessions) {
        await AsyncStorage.setItem('sessions_cache', JSON.stringify(backupData.cache.sessions));
      }

      if (backupData.cache.countLines) {
        await AsyncStorage.setItem('count_lines_cache', JSON.stringify(backupData.cache.countLines));
      }

      if (backupData.settings.lastSync) {
        await AsyncStorage.setItem('last_sync', backupData.settings.lastSync);
      }

      if (backupData.analytics) {
        await AsyncStorage.setItem('analytics_data', JSON.stringify(backupData.analytics));
      }

      __DEV__ && console.log('Backup restored successfully');
    } catch (error) {
      __DEV__ && console.error('Error restoring backup:', error);
      throw error;
    }
  }

  /**
   * Restore from JSON string
   */
  static async restoreFromJSON(jsonString: string): Promise<void> {
    try {
      const backupData: BackupData = JSON.parse(jsonString);
      await this.restoreBackup(backupData);
    } catch (error) {
      __DEV__ && console.error('Error restoring from JSON:', error);
      throw new Error('Invalid backup file format');
    }
  }

  /**
   * Get backup info
   */
  static async getBackupInfo(): Promise<{
    size: number;
    itemCount: number;
    sessionCount: number;
    timestamp: string | null;
  }> {
    try {
      const stats = await getCacheStats();
      const backup = await this.createBackup();
      const backupJson = JSON.stringify(backup);

      return {
        size: backupJson.length,
        itemCount: stats.itemsCount,
        sessionCount: stats.sessionsCount,
        timestamp: backup.timestamp,
      };
    } catch (error) {
      __DEV__ && console.error('Error getting backup info:', error);
      return {
        size: 0,
        itemCount: 0,
        sessionCount: 0,
        timestamp: null,
      };
    }
  }

  /**
   * Clear all data
   */
  static async clearAllData(): Promise<void> {
    try {
      await clearAllCache();

      // Clear additional data
      for (const key of this.STORAGE_KEYS) {
        await AsyncStorage.removeItem(key);
      }

      __DEV__ && console.log('All data cleared');
    } catch (error) {
      __DEV__ && console.error('Error clearing data:', error);
      throw error;
    }
  }
}
