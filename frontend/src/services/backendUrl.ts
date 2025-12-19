import Constants from "expo-constants";
import { Platform } from "react-native";

// Default port from backend/server.py
const DEFAULT_PORT = 8001;

const getDynamicBackendUrl = () => {
  // 1. Priority: Environment Variable (e.g. from .env or EAS build)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // 2. Web: Use current hostname
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      // If we are on localhost, use the default port
      // If we are on a deployed domain, we might want to use the same origin or a specific API subdomain
      // For now, we assume dev mode on web means backend is on DEFAULT_PORT
      return `http://${hostname}:${DEFAULT_PORT}`;
    }
    return `http://localhost:${DEFAULT_PORT}`;
  }

  // 3. Native (Expo Go / Dev Client): Use hostUri to find the dev machine's IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    // We assume the backend is running on the same machine as the Expo bundler
    return `http://${ip}:${DEFAULT_PORT}`;
  }

  // 4. Fallback for Android Emulator (if hostUri is missing for some reason)
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  // 5. Fallback: Localhost (works for iOS Simulator)
  return `http://localhost:${DEFAULT_PORT}`;
};

export const BACKEND_URL = getDynamicBackendUrl();

export const initializeBackendURL = () => {
  console.log("[BackendURL] Initialized with:", BACKEND_URL);
};

export const getBackendURL = () => BACKEND_URL;
