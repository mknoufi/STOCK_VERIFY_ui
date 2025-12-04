const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const initializeBackendURL = () => {
  // Stub implementation
};

export const getBackendURL = () => BACKEND_URL;
