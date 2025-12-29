import Constants from "expo-constants";
import { Platform } from "react-native";

// Default port from backend/server.py
const DEFAULT_PORT = 8001;
const HEALTH_PATH = "/api/health";

const timeoutFetch = async (url: string, timeoutMs = 900): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
};

const stripTrailingSlash = (url: string) =>
  url.endsWith("/") ? url.slice(0, -1) : url;

const buildCandidates = (): string[] => {
  const candidates: string[] = [];

  // 1) Explicit env override
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    candidates.push(process.env.EXPO_PUBLIC_BACKEND_URL);
  }

  // 2) Runtime config from app.config.js extra
  const configUrl = Constants.expoConfig?.extra?.backendUrl as string | undefined;
  if (configUrl) {
    candidates.push(configUrl);
  }

  // 3) Expo host URI (dev server IP)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    candidates.push(`http://${host}:${DEFAULT_PORT}`);
  }

  // 4) Platform-specific fallbacks
  if (Platform.OS === "android") {
    candidates.push(`http://10.0.2.2:${DEFAULT_PORT}`);
  }

  // 5) Web fallback to current hostname
  if (Platform.OS === "web" && typeof window !== "undefined") {
    candidates.push(`http://${window.location.hostname}:${DEFAULT_PORT}`);
  }

  // 6) Localhost as final fallback
  candidates.push(`http://localhost:${DEFAULT_PORT}`);

  // De-dupe while preserving order
  return [...new Set(candidates.filter(Boolean).map(stripTrailingSlash))];
};

// Best-effort initial URL (sync) used until async probing finishes.
export const BACKEND_URL = buildCandidates()[0] ?? `http://localhost:${DEFAULT_PORT}`;

let resolvedBackendUrl: string | null = null;

export const resolveBackendUrl = async (): Promise<string> => {
  if (resolvedBackendUrl) return resolvedBackendUrl;

  const candidates = buildCandidates();
  for (const candidate of candidates) {
    const ok = await timeoutFetch(`${candidate}${HEALTH_PATH}`);
    if (ok) {
      resolvedBackendUrl = candidate;
      console.log("[BackendURL] Selected reachable backend:", candidate);
      return candidate;
    }
  }

  // If none reachable, stick to the best-effort initial URL
  resolvedBackendUrl = BACKEND_URL;
  console.warn(
    "[BackendURL] No backend reachable; falling back to",
    resolvedBackendUrl,
  );
  return resolvedBackendUrl;
};

export const initializeBackendURL = async () => {
  const url = await resolveBackendUrl();
  console.log("[BackendURL] Initialized with:", url);
};

export const getBackendURL = () => resolvedBackendUrl ?? BACKEND_URL;
