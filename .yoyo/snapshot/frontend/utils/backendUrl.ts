import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

let cachedUrl: string | null = null;
let warnedFallback = false;
let portDiscoveryAttempted = false;
let cachedPortInfo: any = null;

// Clear cache function for mobile devices
export const clearBackendURLCache = () => {
  cachedUrl = null;
  portDiscoveryAttempted = false;
  console.log('🔄 Cleared backend URL cache');
};

const DEFAULT_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '8001';

const normalizeUrl = (url: string) => {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
};

const extractHostFromUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const urlPattern = /^(?:https?:\/\/)?([^:/?#]+)(?::\d+)?/i;
  const match = value.match(urlPattern);
  return match ? match[1] : null;
};

const deriveHost = () => {
  // On web, always prefer localhost for backend connection
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // For mobile, try to get the IP from Expo's hostUri first
  // Check multiple possible locations for hostUri
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.hostUri ||
    (Constants as any)?.expoGoConfig?.hostUri;

  console.log(`🔍 Debug deriveHost - hostUri: ${hostUri}, type: ${typeof hostUri}`);

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const [hostPart] = hostUri.split(':');
    console.log(`🔍 Debug - Extracted hostPart from hostUri: ${hostPart}`);
    if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
      console.log(`📡 ✅ Using Expo host IP from hostUri: ${hostPart}`);
      return hostPart;
    }
  }

  // Also check Constants.expoConfig.extra for IP
  const extraConfig = (Constants?.expoConfig as any)?.extra;
  if (extraConfig?.expoGo?.hostUri) {
    const [hostPart] = extraConfig.expoGo.hostUri.split(':');
    if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
      console.log(`📡 ✅ Using Expo host IP from extra config: ${hostPart}`);
      return hostPart;
    }
  }

  const scriptURL = (NativeModules?.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  console.log(`🔍 Debug - scriptURL: ${scriptURL}`);
  const hostFromScript = extractHostFromUrl(scriptURL);
  if (hostFromScript && hostFromScript !== 'localhost' && hostFromScript !== '127.0.0.1') {
    console.log(`📡 ✅ Using script URL host: ${hostFromScript}`);
    return hostFromScript;
  }

  const debuggerHost = (Constants?.expoConfig as any)?.developer?.debuggerHost;
  console.log(`🔍 Debug - debuggerHost: ${debuggerHost}`);
  const hostFromDebugger = extractHostFromUrl(debuggerHost);
  if (hostFromDebugger && hostFromDebugger !== 'localhost' && hostFromDebugger !== '127.0.0.1') {
    console.log(`📡 ✅ Using debugger host: ${hostFromDebugger}`);
    return hostFromDebugger;
  }

  // Try to extract from Constants.expoConfig.debuggerHost or similar
  const allConstants = Constants as any;
  console.log(`🔍 Debug - All Constants keys: ${Object.keys(allConstants || {}).join(', ')}`);
  if (allConstants?.expoConfig) {
    console.log(`🔍 Debug - expoConfig keys: ${Object.keys(allConstants.expoConfig || {}).join(', ')}`);
  }

  // Check environment variable for explicit IP
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    const envHost = extractHostFromUrl(envUrl);
    if (envHost && envHost !== 'localhost' && envHost !== '127.0.0.1') {
      console.log(`📡 Using backend URL from env: ${envHost}`);
      return envHost;
    }
  }

  // Fallback for Android emulator
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // Last resort: try to use the Expo server IP from hostUri even if it's localhost
  // This handles cases where Expo is running on the same machine
  if (hostUri) {
    const [hostPart] = hostUri.split(':');
    if (hostPart) {
      return hostPart;
    }
  }

  console.warn('⚠️ Could not determine backend host, using localhost (may not work on physical device)');
  return 'localhost';
};

/**
 * Try to discover backend port from backend_port.json (web only)
 * or by trying common ports
 */
const discoverBackendPort = async (host: string): Promise<number | null> => {
  if (portDiscoveryAttempted) {
    return null;
  }
  portDiscoveryAttempted = true;

  // On web, try to read backend_port.json
  if (Platform.OS === 'web') {
    try {
      // Try to fetch the port file from the project root (only works in dev)
      const response = await fetch('/backend_port.json');
      if (response.ok) {
        const data = await response.json();
        cachedPortInfo = data; // Cache full port info including MongoDB
        if (data.port) {
          console.log(`📡 Discovered backend port from backend_port.json: ${data.port}`);
          if (data.mongodb) {
            console.log(`📡 MongoDB info: port ${data.mongodb.port}, status: ${data.mongodb.status}`);
          }
          return data.port;
        }
      }
    } catch {
      // File not accessible, continue with port discovery
    }
  }

  // Try to discover port by checking health endpoint on common ports
  const portsToTry = [8001, 8000, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009];

  for (const port of portsToTry) {
    try {
      const response = await fetch(`http://${host}:${port}/health/`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });
      if (response.ok) {
        console.log(`📡 Discovered backend running on port: ${port}`);
        return port;
      }
    } catch {
      // Port not available, try next
      continue;
    }
  }

  return null;
};

let initializationPromise: Promise<string> | null = null;

export const getBackendURL = async (): Promise<string> => {
  // Return cached URL if available
  if (cachedUrl) {
    return cachedUrl;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    // For mobile: Always prioritize Expo's host IP over environment variable
    // This ensures mobile devices use the correct IP automatically
    if (Platform.OS !== 'web') {
      const host = deriveHost();

      // If we got a real IP (not localhost), use it
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const discoveredPort = await discoverBackendPort(host);
        const port = discoveredPort ? discoveredPort.toString() : DEFAULT_PORT;
        const url = `http://${host}:${port}`;
        cachedUrl = normalizeUrl(url);
        console.log(`📡 Auto-detected backend URL for mobile: ${cachedUrl}`);
        return cachedUrl;
      }
    }

    // For web: Use environment variable if set, otherwise use localhost
    if (Platform.OS === 'web') {
      const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (envUrl && envUrl.length > 0) {
        cachedUrl = normalizeUrl(envUrl);
        console.log(`📡 Using backend URL from EXPO_PUBLIC_BACKEND_URL: ${cachedUrl}`);
        return cachedUrl;
      }
    }

    // Fallback: Try to discover port dynamically
    const host = deriveHost();
    const discoveredPort = await discoverBackendPort(host);
    const port = discoveredPort ? discoveredPort.toString() : DEFAULT_PORT;

    const url = `http://${host}:${port}`;

    if (!warnedFallback && host === 'localhost' && Platform.OS !== 'web') {
      console.warn(
        '⚠️  Could not auto-detect backend IP. Using localhost which will not work on physical devices.\n' +
        'Make sure your computer and mobile device are on the same WiFi network.'
      );
      warnedFallback = true;
    }

    if (discoveredPort && discoveredPort !== parseInt(DEFAULT_PORT)) {
      console.log(`⚠️  Backend is running on port ${discoveredPort} instead of default ${DEFAULT_PORT}`);
    }

    cachedUrl = normalizeUrl(url);
    return cachedUrl;
  })();

  return initializationPromise;
};

// Synchronous version for backwards compatibility (uses default port or cached value)
export const getBackendURLSync = (): string => {
  if (cachedUrl) {
    return cachedUrl;
  }

  // For mobile, try to get IP immediately from Expo hostUri
  if (Platform.OS !== 'web') {
    const host = deriveHost();
    // If we got a real IP (not localhost), use it immediately
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const url = `http://${host}:${DEFAULT_PORT}`;
      console.log(`📡 Sync backend URL (mobile IP detected): ${url}`);
      // Don't cache here - let async version handle caching after discovery
      return normalizeUrl(url);
    }
  }

  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.length > 0) {
    // For mobile, ignore localhost in env if we're on mobile
    if (Platform.OS !== 'web') {
      const envHost = extractHostFromUrl(envUrl);
      if (envHost && (envHost === 'localhost' || envHost === '127.0.0.1')) {
        // Ignore localhost in env for mobile, try to derive IP
        const host = deriveHost();
        const url = `http://${host}:${DEFAULT_PORT}`;
        console.log(`📡 Sync backend URL (ignoring localhost in env, using derived): ${url}`);
        return normalizeUrl(url);
      }
    }
    cachedUrl = normalizeUrl(envUrl);
    return cachedUrl;
  }

  const host = deriveHost();
  const url = `http://${host}:${DEFAULT_PORT}`;
  // Don't cache here - let async version handle caching after discovery
  return normalizeUrl(url);
};

// Initialize backend URL early (call this in app startup)
export const initializeBackendURL = async (): Promise<string> => {
  return getBackendURL();
};

/**
 * Get MongoDB port and status information
 * Returns info from backend_port.json if available, or null
 */
export const getMongoDBInfo = async (): Promise<{
  port: number;
  is_running: boolean;
  url: string;
  status: string;
} | null> => {
  // If we have cached port info, use it
  if (cachedPortInfo?.mongodb) {
    return cachedPortInfo.mongodb;
  }

  // Try to fetch from backend_port.json (web only)
  if (Platform.OS === 'web') {
    try {
      const response = await fetch('/backend_port.json');
      if (response.ok) {
        const data = await response.json();
        cachedPortInfo = data;
        if (data.mongodb) {
          return data.mongodb;
        }
      }
    } catch {
      // File not accessible
    }
  }

  // Try to get from health endpoint
  try {
    const backendUrl = await getBackendURL();
    const response = await fetch(`${backendUrl}/health/`);
    if (response.ok) {
      const health = await response.json();
      if (health.mongodb) {
        return health.mongodb;
      }
    }
  } catch {
    // Health endpoint not available
  }

  return null;
};

/**
 * Get complete port mapping information (backend + MongoDB)
 */
export const getPortMapping = async (): Promise<{
  backend: {
    port: number;
    url: string;
    host: string;
  };
  mongodb: {
    port: number;
    is_running: boolean;
    url: string;
    status: string;
  } | null;
}> => {
  const backendUrl = await getBackendURL();
  const url = new URL(backendUrl);
  const backendPort = parseInt(url.port) || 8000;

  const mongodbInfo = await getMongoDBInfo();

  return {
    backend: {
      port: backendPort,
      url: backendUrl,
      host: url.hostname,
    },
    mongodb: mongodbInfo,
  };
};
