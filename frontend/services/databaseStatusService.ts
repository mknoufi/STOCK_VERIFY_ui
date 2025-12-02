/**
 * Database Status Service
 * Handles database connection status and sync status
 */

import api from './api';
import { getSyncStatus } from './syncService';

export interface DatabaseStatus {
  configured: boolean;
  use_sql_server: boolean;
  connection_status: 'connected' | 'disconnected' | 'error' | 'not_configured';
  host?: string;
  database?: string;
  auth_method?: string;
  port?: number;
  last_check?: string;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  queuedOperations: number;
  lastSync: string | null;
  cacheSize: number;
  needsSync: boolean;
}

export interface DatabaseSyncStatus {
  database: DatabaseStatus;
  sync: SyncStatus;
  lastUpdate: Date;
}

/**
 * Get database configuration and status
 */
export const getDatabaseStatus = async (): Promise<DatabaseStatus> => {
  try {
    const response = await api.get('/erp/config');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching database status:', error);
    return {
      configured: false,
      use_sql_server: false,
      connection_status: 'error',
      error: error.response?.data?.detail || error.message || 'Failed to fetch status',
    };
  }
};

/**
 * Get sync status
 */
export const getSyncStatusData = async (): Promise<SyncStatus> => {
  try {
    return await getSyncStatus();
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return {
      isOnline: false,
      queuedOperations: 0,
      lastSync: null,
      cacheSize: 0,
      needsSync: false,
    };
  }
};

/**
 * Get complete database sync status
 */
export const getDatabaseSyncStatus = async (): Promise<DatabaseSyncStatus> => {
  const [database, sync] = await Promise.all([
    getDatabaseStatus(),
    getSyncStatusData(),
  ]);

  return {
    database,
    sync,
    lastUpdate: new Date(),
  };
};

/**
 * Test database connection
 */
export const testDatabaseConnection = async (): Promise<{
  status: 'connected' | 'disconnected' | 'error';
  message: string;
}> => {
  try {
    const response = await api.post('/erp/test');
    return response.data;
  } catch (error: any) {
    return {
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Connection test failed',
    };
  }
};
