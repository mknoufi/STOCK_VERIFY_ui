/**
 * Dynamic Port Detection Utility
 * Automatically detects which port the frontend is running on
 * Supports Expo Metro bundler (8081) and Expo Web (19006, 19000-19002)
 */

import { Platform } from 'react-native';

// Common Expo ports
const EXPO_PORTS = [19006, 19000, 19001, 19002, 8081];
const METRO_PORT = 8081;
const DEFAULT_WEB_PORT = 19006;

let cachedPort: number | null = null;
let portDetectionAttempted = false;

/**
 * Detect which port the frontend is running on
 * Checks common Expo ports and returns the first one that's active
 */
export const detectFrontendPort = async (): Promise<number | null> => {
  if (cachedPort) {
    return cachedPort;
  }

  if (portDetectionAttempted) {
    return null;
  }

  portDetectionAttempted = true;

  // On web, try to detect from window location
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const port = window.location.port;
    if (port) {
      const portNum = parseInt(port, 10);
      if (!isNaN(portNum) && portNum > 0) {
        cachedPort = portNum;
        if (__DEV__) {
          __DEV__ && console.log(`📡 Detected frontend port from window.location: ${cachedPort}`);
        }
        return cachedPort;
      }
    }
  }

  // Try to detect by checking which ports are in use
  // Check common Expo ports
  for (const port of EXPO_PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });

      if (response.ok || response.status < 500) {
        cachedPort = port;
        if (__DEV__) {
          __DEV__ && console.log(`📡 Detected frontend port: ${cachedPort}`);
        }
        return cachedPort;
      }
    } catch {
      // Port not available, try next
      continue;
    }
  }

  // Fallback: Use default web port for web platform
  if (Platform.OS === 'web') {
    cachedPort = DEFAULT_WEB_PORT;
    if (__DEV__) {
      __DEV__ && console.log(`📡 Using default web port: ${cachedPort}`);
    }
    return cachedPort;
  }

  // Fallback: Use Metro port for native platforms
  cachedPort = METRO_PORT;
  if (__DEV__) {
    __DEV__ && console.log(`📡 Using default Metro port: ${cachedPort}`);
  }
  return cachedPort;
};

/**
 * Get frontend port synchronously (returns cached or default)
 */
export const getFrontendPortSync = (): number => {
  if (cachedPort) {
    return cachedPort;
  }

  // On web, try to get from window location
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const port = window.location.port;
    if (port) {
      const portNum = parseInt(port, 10);
      if (!isNaN(portNum) && portNum > 0) {
        cachedPort = portNum;
        return cachedPort;
      }
    }
  }

  // Return default based on platform
  return Platform.OS === 'web' ? DEFAULT_WEB_PORT : METRO_PORT;
};

/**
 * Clear cached port (useful for testing or when port changes)
 */
export const clearPortCache = (): void => {
  cachedPort = null;
  portDetectionAttempted = false;
};

/**
 * Get frontend URL dynamically
 */
export const getFrontendURL = async (): Promise<string> => {
  const port = await detectFrontendPort();
  return `http://localhost:${port || DEFAULT_WEB_PORT}`;
};

/**
 * Get frontend URL synchronously
 */
export const getFrontendURLSync = (): string => {
  const port = getFrontendPortSync();
  return `http://localhost:${port}`;
};

export default {
  detectFrontendPort,
  getFrontendPortSync,
  clearPortCache,
  getFrontendURL,
  getFrontendURLSync,
};
