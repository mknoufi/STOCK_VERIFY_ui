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
import { initializeSyncService } from "../src/services/syncService";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { ThemeService } from "../src/services/themeService";
import { useSettingsStore } from "../src/store/settingsStore";
import { useTheme } from "../src/hooks/useTheme";
import { useSystemTheme } from "../src/hooks/useSystemTheme";
import { ToastProvider } from "../src/components/ToastProvider";
import { initializeBackendURL } from "../src/utils/backendUrl";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/services/queryClient";

// import DebugPanel from '../components/DebugPanel';
import { UnistylesThemeProvider } from "../src/theme/Provider";
import { ThemeProvider } from "../src/theme/ThemeContext";
import { initReactotron } from "../src/services/devtools/reactotron";
import {
  startOfflineQueue,
  stopOfflineQueue,
} from "../src/services/offlineQueue";
import apiClient from "../src/services/httpClient";
import { initSentry } from "../src/services/sentry";

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

// Provide a single place to bootstrap auth, settings, network listeners, and routing.
export default function RootLayout() {
  if (__DEV__) {
    console.log("🌐 [DEV] RootLayout component rendering...");
  }
  const { user, isLoading, loadStoredAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const theme = useTheme();
  useSystemTheme();
  const segments = useSegments();
  const router = useRouter();
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
    // Safety: Maximum initialization timeout (10 seconds)
    const maxTimeout = setTimeout(() => {
      console.warn(
        "⚠️ Maximum initialization timeout reached - forcing app to render",
      );
      setIsInitialized(true);
    }, 10000);

    // Initialize app with error handling
    const initialize = async (): Promise<void> => {
      console.log("🔵 [STEP 5] Initialize function called");
      console.log("🔵 [STEP 5] Starting async initialization...");
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
        useAuthStore.getState().setLoading(false); // Ensure loading is cleared
        setIsInitialized(true);
        setInitError(null);
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
        console.log("⚠️ [INIT] Initialization had errors but continuing...");
        clearTimeout(maxTimeout);
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
  }, []);

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

    if (__DEV__) {
      console.log("🚀 [NAV] Starting navigation logic:", {
        user: user ? { role: user.role, username: user.username } : null,
        currentRoute: segments[0],
        platform: Platform.OS,
      });
    }

    // Small delay to prevent redirect loops on web
    const timer = setTimeout(
      () => {
        const currentRoute = segments[0] as string | undefined;
        const inStaffGroup = currentRoute === "staff";
        const inSupervisorGroup = currentRoute === "supervisor";
        const inAdminGroup = currentRoute === "admin";
        const isRegisterPage = currentRoute === "register";
        const isLoginPage = currentRoute === "login";
        const isWelcomePage = currentRoute === "welcome";
        const isIndexPage = !currentRoute || currentRoute === "index";

        // If no user, redirect to login/register/welcome only
        if (!user) {
          if (__DEV__) {
            console.log("👤 [NAV] No user, checking route:", {
              isIndexPage,
              isRegisterPage,
              isLoginPage,
              isWelcomePage,
            });
          }
          if (
            !isIndexPage &&
            !isRegisterPage &&
            !isLoginPage &&
            !isWelcomePage
          ) {
            if (__DEV__) {
              console.log("🔄 [NAV] Redirecting to /welcome (no user)");
            }
            router.replace("/welcome");
          }
          return;
        }

        // If user exists and is on auth pages, redirect to their dashboard
        if (isLoginPage || isRegisterPage || isIndexPage || isWelcomePage) {
          let targetRoute: string;
          // On web, always redirect admin/supervisor to admin panel
          if (
            Platform.OS === "web" &&
            (user.role === "supervisor" || user.role === "admin")
          ) {
            targetRoute = "/admin/metrics";
          } else if (user.role === "supervisor" || user.role === "admin") {
            targetRoute = "/supervisor/dashboard";
          } else {
            targetRoute = "/staff/home";
          }

          if (__DEV__) {
            console.log("🔄 [NAV] User logged in on auth page, redirecting:", {
              from: currentRoute,
              to: targetRoute,
              role: user.role,
            });
          }
          router.replace(targetRoute as any);
          return;
        }

        // Ensure users stay in their role-specific areas
        // On web, admin/supervisor should go to admin control panel
        if (
          Platform.OS === "web" &&
          (user.role === "supervisor" || user.role === "admin") &&
          !inAdminGroup
        ) {
          if (__DEV__) {
            console.log(
              "🔄 [NAV] Redirecting admin/supervisor to control panel",
            );
          }
          router.replace("/admin/control-panel" as any);
        } else if (
          (user.role === "supervisor" || user.role === "admin") &&
          !inSupervisorGroup &&
          !inAdminGroup
        ) {
          if (__DEV__) {
            console.log("🔄 [NAV] Redirecting supervisor/admin to dashboard");
          }
          router.replace("/supervisor/dashboard" as any);
        } else if (user.role === "staff" && !inStaffGroup) {
          if (__DEV__) {
            console.log("🔄 [NAV] Redirecting staff to home");
          }
          router.replace("/staff/home" as any);
        } else {
          if (__DEV__) {
            console.log("✅ [NAV] User is in correct area, no redirect needed");
          }
        }
      },
      Platform.OS === "web" ? 200 : 100,
    );

    return () => clearTimeout(timer);
  }, [isInitialized, isLoading, router, segments, user]);

  // Show loading state to prevent blank screen (both web and mobile)
  if (!isInitialized || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A", // modernColors.background.primary
        }}
      >
        <ActivityIndicator
          color="#3B82F6" // modernColors.primary[500]
          style={{ marginBottom: 24 }}
          size="large"
        />
        <Text
          style={{
            color: "#F8FAFC", // modernColors.text.primary
            fontSize: 24, // modernTypography.heading.h3.fontSize
            fontWeight: "700", // modernTypography.heading.h3.fontWeight
            letterSpacing: 0.5,
          }}
        >
          {Platform.OS === "web" ? "StockVerify Admin" : "StockVerify"}
        </Text>
        <Text
          style={{
            color: "#94A3B8", // modernColors.text.tertiary
            fontSize: 14, // modernTypography.body.small.fontSize
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
              borderRadius: 12, // modernBorderRadius.lg
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.2)",
              maxWidth: 300,
            }}
          >
            <Text
              style={{
                color: "#EF4444", // modernColors.error
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
          backgroundColor: "#0F172A",
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
            color: "#EF4444",
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          Initialization Error
        </Text>
        <Text
          style={{
            color: "#94A3B8",
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
          <Text style={{ color: "#3B82F6", fontSize: 14, fontWeight: "600" }}>
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
          <UnistylesThemeProvider>
            <ToastProvider>
              <StatusBar style={theme.isDark ? "light" : "dark"} />
              {/* {__DEV__ && flags.enableDebugPanel && <DebugPanel />} */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#121212" },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="register" />
                <Stack.Screen name="staff/home" />
                <Stack.Screen name="staff/scan" />
                <Stack.Screen name="staff/item-detail" />
                <Stack.Screen name="staff/history" />
                <Stack.Screen name="staff/appearance" />
                <Stack.Screen name="supervisor/dashboard" />
                <Stack.Screen name="supervisor/sessions" />
                <Stack.Screen name="supervisor/session/[id]" />
                <Stack.Screen name="supervisor/settings" />
                <Stack.Screen name="supervisor/appearance" />
                <Stack.Screen name="supervisor/db-mapping" />
                <Stack.Screen name="supervisor/activity-logs" />
                <Stack.Screen name="supervisor/error-logs" />
                <Stack.Screen name="supervisor/export-schedules" />
                <Stack.Screen name="supervisor/export-results" />
                <Stack.Screen name="supervisor/sync-conflicts" />
                <Stack.Screen name="supervisor/offline-queue" />
                <Stack.Screen name="admin/permissions" />
                <Stack.Screen name="admin/metrics" />
                <Stack.Screen name="admin/control-panel" />
                <Stack.Screen name="admin/logs" />
                <Stack.Screen name="admin/sql-config" />
                <Stack.Screen name="admin/reports" />
                <Stack.Screen name="admin/security" />
                <Stack.Screen name="help" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ToastProvider>
          </UnistylesThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

// ==========================================
// END OF LOGGING
// ==========================================
