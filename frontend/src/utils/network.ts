/**
 * Network State Detection Utilities
 * 
 * Provides three-state network model for reliable offline-first logic.
 * Addresses the issue where unknown network state defaults to online.
 */

import { useNetworkStore } from '../store/networkStore';

/**
 * Three-state network status
 * - ONLINE: Confirmed network + backend connectivity
 * - OFFLINE: Confirmed no network
 * - UNKNOWN: Network state is indeterminate
 */
export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

/**
 * Network check result with detailed status
 */
export interface NetworkCheckResult {
  status: NetworkStatus;
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  shouldAttemptApi: boolean;
  shouldAllowWrites: boolean;
}

/**
 * Get detailed network status with three-state model.
 * Use this for operations that need to understand network nuance.
 */
export function getNetworkStatus(): NetworkCheckResult {
  const state = useNetworkStore.getState();
  const { isOnline, isInternetReachable, connectionType } = state;

  let status: NetworkStatus;

  // Determine three-state status
  if (isOnline === undefined || isOnline === null) {
    // Network state is indeterminate
    status = 'UNKNOWN';
  } else if (!isOnline) {
    // Definitely offline
    status = 'OFFLINE';
  } else if (isInternetReachable === false) {
    // Connected to network but no internet (captive portal, etc.)
    status = 'OFFLINE';
  } else if (isInternetReachable === true) {
    // Confirmed online with internet
    status = 'ONLINE';
  } else {
    // isOnline === true but isInternetReachable is null/unknown
    // This is the edge case - network is up but we can't confirm internet
    status = 'UNKNOWN';
  }

  // Determine behavior flags based on status
  const shouldAttemptApi = status !== 'OFFLINE';
  // For writes, be conservative - only allow if definitively online
  const shouldAllowWrites = status === 'ONLINE';

  return {
    status,
    isOnline: isOnline ?? false,
    isInternetReachable,
    connectionType,
    shouldAttemptApi,
    shouldAllowWrites,
  };
}

/**
 * Simple boolean check for "is definitively online".
 * Treats UNKNOWN as OFFLINE for safety (conservative approach).
 * 
 * Use this for write operations where you need certainty.
 */
export function isDefinitelyOnline(): boolean {
  const { status } = getNetworkStatus();
  return status === 'ONLINE';
}

/**
 * Check if we should attempt API calls.
 * More lenient - will attempt if not definitely offline.
 * 
 * Use this for read operations where cache fallback exists.
 */
export function shouldAttemptApiCall(): boolean {
  const { status } = getNetworkStatus();
  return status !== 'OFFLINE';
}

/**
 * Check if we're definitively offline.
 * 
 * Use this to skip API calls entirely when we know it will fail.
 */
export function isDefinitelyOffline(): boolean {
  const { status } = getNetworkStatus();
  return status === 'OFFLINE';
}

/**
 * Check if network state is unknown/indeterminate.
 * 
 * Use this to show appropriate UI warnings.
 */
export function isNetworkUnknown(): boolean {
  const { status } = getNetworkStatus();
  return status === 'UNKNOWN';
}

/**
 * Legacy compatibility: isOnline function
 * 
 * @deprecated Use getNetworkStatus() or isDefinitelyOnline() for better semantics
 */
export function isOnline(): boolean {
  // For backward compatibility, maintain the old behavior:
  // - Attempt API calls unless definitely offline
  // This matches the existing shouldAttemptApiCall logic
  return shouldAttemptApiCall();
}
