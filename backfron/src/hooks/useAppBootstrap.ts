import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../store/authStore";
import { initializeNetworkListener } from "../services/networkService";
import { syncService } from "../services/sync/syncService";
import { ThemeService } from "../services/themeService";
import { useSettingsStore } from "../store/settingsStore";
import { initializeBackendURL } from "../utils/backendUrl";
import { initReactotron } from "../services/devtools/reactotron";
import { initSentry } from "../services/sentry";
import { initializeToken } from "../services/httpClient";

export function useAppBootstrap() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { loadStoredAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Initialize Sentry (non-blocking, only in production)
    initSentry();
    // Initialize Reactotron in dev if enabled (non-blocking)
    initReactotron();

    // Safety: Maximum initialization timeout (10 seconds)
    const maxTimeout = setTimeout(() => {
      console.warn(
        "⚠️ Maximum initialization timeout reached - forcing app to render",
      );
      setIsInitialized(true);
    }, 10000);

    // Initialize app with error handling
    const initialize = async (): Promise<void> => {
      console.log("🔵 [BOOTSTRAP] Initialize function called");
      console.log("🔵 [BOOTSTRAP] Starting async initialization...");
      try {
        // Initialize backend URL discovery first with timeout
        try {
          const backendUrlPromise = initializeBackendURL();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Backend URL initialization timeout")),
              5000,
            ),
          );
          await Promise.race([backendUrlPromise, timeoutPromise]);
        } catch (urlError) {
          if (__DEV__) {
            console.warn(
              "⚠️ Backend URL initialization failed or timed out:",
              urlError,
            );
          }
          // Continue anyway - will use default URL
        }

        // Initialize token from storage FIRST (before loadStoredAuth to ensure httpClient has token)
        try {
          await initializeToken();
        } catch (tokenError) {
          if (__DEV__) {
            console.warn("⚠️ Token initialization failed:", tokenError);
          }
        }

        // Load stored auth
        try {
          const authPromise = loadStoredAuth();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Auth loading timeout")), 3000),
          );
          await Promise.race([authPromise, timeoutPromise]);
        } catch (authError) {
          if (__DEV__) {
            console.warn("⚠️ Auth loading failed or timed out:", authError);
          }
          // Continue anyway - user can login manually
        }

        // Load settings
        try {
          const settingsPromise = loadSettings();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Settings loading timeout")),
              3000,
            ),
          );
          await Promise.race([settingsPromise, timeoutPromise]);
        } catch (settingsError) {
          if (__DEV__) {
            console.warn(
              "⚠️ Settings loading failed or timed out:",
              settingsError,
            );
          }
          // Continue anyway - will use defaults
        }

        // Initialize theme
        try {
          await ThemeService.initialize();
        } catch (themeError) {
          if (__DEV__) {
            console.warn("⚠️ Theme initialization failed:", themeError);
          }
          // Continue anyway - will use default theme
        }

        if (Platform.OS !== "web") {
          const networkUnsubscribe = initializeNetworkListener();

          // Trigger initial sync
          syncService.syncAll().catch((err) => {
            console.warn("Initial sync failed:", err);
          });

          // Store cleanup for later
          cleanupRef.current.push(() => {
            networkUnsubscribe();
          });
        }

        // Always set initialized to true, even if some steps failed
        clearTimeout(maxTimeout);
        setIsInitialized(true);
        setInitError(null);
        console.log("✅ [BOOTSTRAP] Initialization completed successfully");
        await SplashScreen.hideAsync();
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const errorMessage = err.message || String(error);
        // Log error details in development, minimal logging in production
        if (__DEV__) {
          console.error("❌ Initialization error:", err);
        } else {
          // Production: log only essential error info via Sentry
          import("../services/sentry")
            .then(({ captureException }) => {
              captureException(err as Error, {
                context: "App initialization",
                message: errorMessage,
              });
            })
            .catch(() => {
              // Fallback if Sentry not available
              console.error("App initialization failed:", errorMessage);
            });
        }
        setInitError(errorMessage);
        // Always set initialized to true to prevent infinite loading
        console.log(
          "⚠️ [BOOTSTRAP] Initialization had errors but continuing...",
        );
        clearTimeout(maxTimeout);
        setIsInitialized(true);
        await SplashScreen.hideAsync();
      }
    };

    initialize();

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(maxTimeout);
      cleanupRef.current.forEach((fn) => {
        try {
          fn();
        } catch (cleanupError) {
          console.warn("Cleanup error:", cleanupError);
        }
      });
      cleanupRef.current = [];
    };
    // The store functions are stable but lint cannot verify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isInitialized, initError };
}
