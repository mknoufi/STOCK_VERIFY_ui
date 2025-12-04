/**
 * useVersionCheck Hook
 * Provides version checking and upgrade notification functionality
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { useAppVersion } from './useAppVersion';
import {
  checkVersion,
  VersionCheckResult,
} from '../services/versionService';

export interface UseVersionCheckOptions {
  /** Check version on mount, default true */
  checkOnMount?: boolean;
  /** Auto-check interval in ms, 0 to disable */
  checkInterval?: number;
  /** Callback when force update is required */
  onForceUpdate?: (result: VersionCheckResult) => void;
  /** Callback when optional update is available */
  onUpdateAvailable?: (result: VersionCheckResult) => void;
}

export interface UseVersionCheckResult {
  /** Last version check result */
  versionInfo: VersionCheckResult | null;
  /** Whether a version check is in progress */
  isChecking: boolean;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether a force update is required (version incompatible) */
  forceUpdate: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Manually trigger a version check */
  checkForUpdates: () => Promise<VersionCheckResult | null>;
  /** Dismiss the update notification (for optional updates) */
  dismissUpdate: () => void;
  /** Whether the update has been dismissed */
  isDismissed: boolean;
}

export const useVersionCheck = (
  options: UseVersionCheckOptions = {}
): UseVersionCheckResult => {
  const {
    checkOnMount = true,
    checkInterval = 0,
    onForceUpdate,
    onUpdateAvailable,
  } = options;

  const { version: clientVersion } = useAppVersion();
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkForUpdates = useCallback(async (): Promise<VersionCheckResult | null> => {
    if (!clientVersion || clientVersion === 'Unknown') {
      __DEV__ && console.log('Version check skipped: client version not available');
      return null;
    }

    setIsChecking(true);
    setError(null);

    try {
      const result = await checkVersion(clientVersion);
      setVersionInfo(result);

      // Handle force update
      if (result.force_update && onForceUpdate) {
        onForceUpdate(result);
      }

      // Handle optional update available
      if (result.update_available && !result.force_update && onUpdateAvailable) {
        onUpdateAvailable(result);
      }

      // Clear dismissed state on new check with different version
      if (result.current_version !== versionInfo?.current_version) {
        setIsDismissed(false);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check for updates';
      setError(errorMessage);
      __DEV__ && console.error('Version check failed:', err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [clientVersion, onForceUpdate, onUpdateAvailable, versionInfo?.current_version]);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Check on mount
  useEffect(() => {
    if (checkOnMount && clientVersion && clientVersion !== 'Unknown') {
      checkForUpdates();
    }
  }, [checkOnMount, clientVersion, checkForUpdates]);

  // Set up interval checking
  useEffect(() => {
    if (checkInterval <= 0) return;

    const intervalId = setInterval(() => {
      checkForUpdates();
    }, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkInterval, checkForUpdates]);

  return {
    versionInfo,
    isChecking,
    updateAvailable: versionInfo?.update_available ?? false,
    forceUpdate: versionInfo?.force_update ?? false,
    error,
    checkForUpdates,
    dismissUpdate,
    isDismissed,
  };
};

export default useVersionCheck;
