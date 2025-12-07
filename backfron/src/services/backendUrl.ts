import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Default port for the backend
const DEFAULT_BACKEND_PORT = 8000;

/**
 * Dynamically determines the backend URL based on the environment.
 * - In development: Uses the Expo debugger host IP (same machine as Expo)
 * - In production: Uses the configured EXPO_PUBLIC_BACKEND_URL
 * - Fallback: localhost for simulators/emulators
 */
const getDebuggerHost = (): string | null => {
  try {
    // For Expo SDK 49+
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) return debuggerHost;

    // Legacy fallback for older SDK versions
    const manifest = Constants.manifest || Constants.manifest2;
    if (manifest?.debuggerHost) {
      return manifest.debuggerHost.split(':')[0];
    }

    // For Expo Go
    if (Constants.experienceUrl) {
      const match = Constants.experienceUrl.match(/\/\/([^:]+)/);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
};

const getDynamicBackendUrl = (): string => {
  // 1. First check if explicitly configured via environment
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Get port from environment or use default
  const port = process.env.EXPO_PUBLIC_BACKEND_PORT || DEFAULT_BACKEND_PORT;

  // 3. In development, try to get the debugger host (Expo dev server IP)
  if (__DEV__) {
    const debuggerHost = getDebuggerHost();

    if (debuggerHost) {
      console.log(`🌐 [BackendURL] Using debugger host: ${debuggerHost}:${port}`);
      return `http://${debuggerHost}:${port}`;
    }
  }

  // 4. Platform-specific fallbacks for simulators/emulators
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return `http://10.0.2.2:${port}`;
  }

  // 5. iOS simulator and web can use localhost
  return `http://localhost:${port}`;
};

// Cache the URL after first resolution
let cachedBackendUrl: string | null = null;

export const getBackendURL = (): string => {
  if (!cachedBackendUrl) {
    cachedBackendUrl = getDynamicBackendUrl();
    console.log(`🔗 [BackendURL] Resolved to: ${cachedBackendUrl}`);
  }
  return cachedBackendUrl;
};

export const initializeBackendURL = (): void => {
  // Force re-resolution of the URL
  cachedBackendUrl = null;
  getBackendURL();
};

// For direct access (legacy compatibility)
const BACKEND_URL = getDynamicBackendUrl();
export default BACKEND_URL;
