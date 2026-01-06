// ==========================================
// Root Layout for Stock Verify App
// ==========================================

import React from "react";

import { Platform, View, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { initializeNetworkListener } from "../src/services/networkService";
import { initializeSyncService } from "../src/services/syncManager";

import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { ThemeService } from "../src/services/themeService";
import { useSettingsStore } from "../src/store/settingsStore";
import { useTheme } from "../src/hooks/useTheme";
import { ToastProvider } from "../src/components/feedback/ToastProvider";
import { initializeBackendURL } from "../src/utils/backendUrl";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/services/queryClient";
import { ThemeProvider } from "../src/context/ThemeContext";
import { initReactotron } from "../src/services/devtools/reactotron";
import {
  startOfflineQueue,
  stopOfflineQueue,
} from "../src/services/offlineQueue";
import apiClient from "../src/services/httpClient";
import { initSentry } from "../src/services/sentry";
import { mmkvStorage } from "../src/services/mmkvStorage";
import { AuthGuard } from "../src/components/auth/AuthGuard";
import {
  modernColors,
  modernTypography,
} from "../src/styles/modernDesignSystem";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

// keep the splash screen visible while complete fetching resources
// On web, wrap in try-catch to prevent blocking
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
} else {
  // On web, splash screen may not be needed
  SplashScreen.preventAutoHideAsync().catch(() => {
    // Silent fail for web platform
  });
}

// Debug logs only in development
if (__DEV__) {
  console.log("🌐 [DEV] _layout.tsx module loaded, Platform:", Platform.OS);
}

function RootStack() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="register" />
        <Stack.Screen name="help" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

// Provide a single place to bootstrap auth, settings, network listeners, and routing.
export default function RootLayout() {
  if (__DEV__) {
    console.log("🌐 [DEV] RootLayout component rendering...");
  }
  const { user, isLoading, loadStoredAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const segments = useSegments();
  const _router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [isInitialized, setIsInitialized] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const cleanupRef = React.useRef<(() => void)[]>([]);

  // Development-only logging (removed in production builds)
  React.useEffect(() => {
    if (__DEV__) {
      // Only log in development mode
    }
  }, []);

  React.useEffect(() => {
    // Initialize Sentry (non-blocking, only in production)
    initSentry();
    // Initialize Reactotron in dev if enabled (non-blocking)
    initReactotron();

    // Web-specific safety: Force hide splash screen after 2s to prevent white screen
    if (Platform.OS === "web") {
      setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Ignore error
        }
      }, 2000);
    }

    // Safety: Maximum initialization timeout (10 seconds)
    const maxTimeout = setTimeout(() => {
      console.warn(
        "⚠️ Maximum initialization timeout reached - forcing app to render",
      );
      // Ensure both local state and auth store consider initialization complete
      useAuthStore.setState({ isInitialized: true });
      setIsInitialized(true);
      // Also hide the splash screen so the UI becomes visible even if fonts never load
      SplashScreen.hideAsync().catch((e) => {
        if (__DEV__) {
          console.error("SplashScreen hide failed after max timeout:", e);
        }
      });
    }, 10000);

    // Initialize app with error handling
    const initialize = async (): Promise<void> => {
      __DEV__ && console.log("🔵 [STEP 5] Initialize function called");
      __DEV__ && console.log("🔵 [STEP 5] Starting async initialization...");

      // Wait for fonts to load
      if (!fontsLoaded) {
        return;
      }

      // Emergency fallback: force initialization after 3 seconds
      const emergencyTimeout = setTimeout(() => {
        if (__DEV__) {
          console.error("🚨 [EMERGENCY] FORCING INITIALIZATION AFTER 3s!");
          console.error(
            "🚨 Current isLoading:",
            useAuthStore.getState().isLoading,
          );
          console.error("🚨 Current isInitialized:", isInitialized);
        }
        useAuthStore.getState().setLoading(false);
        useAuthStore.setState({ isInitialized: true });
        setIsInitialized(true);
        setInitError("Initialization timed out - some features may not work");
        SplashScreen.hideAsync().catch((e) => {
          __DEV__ && console.error("SplashScreen hide failed:", e);
        });
      }, 3000);

      try {
        // Initialize storage first
        try {
          const mmkvPromise = mmkvStorage.initialize();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("MMKV initialization timeout")),
              2000,
            ),
          );
          await Promise.race([mmkvPromise, timeoutPromise]);
        } catch (e) {
          console.warn("⚠️ MMKV initialization failed or timed out:", e);
        }

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

        // Initialize theme (with timeout)
        try {
          const themePromise = ThemeService.initialize();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Theme initialization timeout")),
              1000,
            ),
          );
          await Promise.race([themePromise, timeoutPromise]);
        } catch (themeError) {
          if (__DEV__) {
            console.warn("⚠️ Theme initialization failed:", themeError);
          }
          // Continue anyway - will use default theme
        }

        if (Platform.OS !== "web") {
          const networkUnsubscribe = initializeNetworkListener();
          const syncService = initializeSyncService();

          // Start offline queue (if enabled) after listeners are ready
          try {
            startOfflineQueue(apiClient);
          } catch (e) {
            if (__DEV__) {
              console.warn("Offline queue start failed:", e);
            }
          }

          // Store cleanup for later
          cleanupRef.current.push(() => {
            networkUnsubscribe();
            syncService.cleanup();
            try {
              stopOfflineQueue();
            } catch {}
          });
        }

        // Always set initialized to true, even if some steps failed
        clearTimeout(maxTimeout);
        clearTimeout(emergencyTimeout);
        useAuthStore.getState().setLoading(false); // Ensure loading is cleared
        useAuthStore.setState({ isInitialized: true }); // Ensure store is initialized
        setIsInitialized(true);
        setInitError(null);
        __DEV__ &&
          console.log("✅ [INIT] Initialization completed successfully");
        await SplashScreen.hideAsync();
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const errorMessage = err.message || String(error);
        // Log error details in development, minimal logging in production
        if (__DEV__) {
          console.error("❌ Initialization error:", err);
        } else {
          // Production: log only essential error info via Sentry
          import("../src/services/sentry")
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
        console.warn("⚠️ [INIT] Initialization had errors but continuing...");
        clearTimeout(maxTimeout);
        clearTimeout(emergencyTimeout);
        useAuthStore.getState().setLoading(false);
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
  }, [fontsLoaded]);

  React.useEffect(() => {
    // Wait for initialization and loading to complete
    if (!isInitialized || isLoading) {
      if (__DEV__) {
        console.log("⏳ [NAV] Waiting for initialization:", {
          isInitialized,
          isLoading,
        });
      }
      return;
    }

    // Navigation/redirect logic now handled by AuthGuard to avoid duplication
    if (__DEV__) {
      console.log(
        "🚀 [NAV] Initialization complete; navigation handled in AuthGuard",
      );
    }
  }, [isInitialized, isLoading, segments, user]);

  // Show loading state to prevent blank screen (both web and mobile)
  if (!isInitialized || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: modernColors.background.primary,
        }}
      >
        <ActivityIndicator
          color={modernColors.primary[500]}
          style={{ marginBottom: 24 }}
          size="large"
        />
        <Text
          style={{
            color: modernColors.text.primary,
            fontSize: modernTypography.h3.fontSize,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          {Platform.OS === "web" ? "StockVerify Admin" : "StockVerify"}
        </Text>
        <Text
          style={{
            color: modernColors.text.tertiary,
            fontSize: modernTypography.body.small.fontSize,
            marginTop: 8,
            letterSpacing: 0.5,
          }}
        >
          Initializing Secure Session...
        </Text>
        {initError && (
          <View
            style={{
              marginTop: 32,
              padding: 16,
              backgroundColor: "rgba(239, 68, 68, 0.1)", // modernColors.error with opacity
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.2)",
              maxWidth: 300,
            }}
          >
            <Text
              style={{
                color: modernColors.error.main,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Warning: {initError}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Show error state if initialization failed
  if (isInitialized && initError && Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: modernColors.background.primary,
          padding: 20,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 32 }}>⚠️</Text>
        </View>
        <Text
          style={{
            color: modernColors.error.main,
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          Initialization Error
        </Text>
        <Text
          style={{
            color: modernColors.text.tertiary,
            fontSize: 14,
            marginBottom: 32,
            textAlign: "center",
            maxWidth: 400,
            lineHeight: 20,
          }}
        >
          {initError}
        </Text>
        <View
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: modernColors.primary[500],
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Attempting to continue...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <AuthGuard>
              <RootStack />
            </AuthGuard>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

// ==========================================
// END OF LOGGING
// ==========================================
