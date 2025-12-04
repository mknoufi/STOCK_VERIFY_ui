/**
 * Version Check Service
 * Provides app version checking and upgrade notification functionality
 */
import api from './httpClient';

export interface VersionCheckResult {
  is_compatible: boolean;
  is_latest: boolean;
  update_available: boolean;
  update_type: 'major' | 'minor' | 'patch' | null;
  client_version: string;
  minimum_version: string;
  current_version: string;
  force_update: boolean;
  timestamp: string;
  app_name?: string;
  release_notes_url?: string | null;
  changelog?: string | null;
  error?: string;
}

/**
 * Check if the current app version is compatible with the backend
 * and if updates are available
 */
export const checkVersion = async (
  clientVersion: string
): Promise<VersionCheckResult> => {
  try {
    const response = await api.get<VersionCheckResult>('/version/check', {
      params: { client_version: clientVersion },
    });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error('Version check error:', error);

    // Return a safe default that doesn't force updates on error
    return {
      is_compatible: true,
      is_latest: true,
      update_available: false,
      update_type: null,
      client_version: clientVersion,
      minimum_version: '1.0.0',
      current_version: clientVersion,
      force_update: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Version check failed',
    };
  }
};

/**
 * Get the current backend version info
 */
export const getBackendVersion = async (): Promise<{
  version: string;
  name: string;
  environment: string;
  build_time: string;
}> => {
  try {
    const response = await api.get('/version');
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error('Get backend version error:', error);
    throw error;
  }
};

export const versionApi = {
  checkVersion,
  getBackendVersion,
};

export default versionApi;
