// ==========================================
// DETAILED LOGGING ADDED - Track every step
// ==========================================

import React from "react";
import { Platform, View, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { useTheme } from "../src/hooks/useTheme";
import { useSystemTheme } from "../src/hooks/useSystemTheme";
import { ToastProvider } from "../src/components/ToastProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/services/queryClient";
import { ThemeProvider } from "@/theme/Provider";
import { useAppBootstrap } from "../src/hooks/useAppBootstrap";

// keep the splash screen visible while complete fetching resources
SplashScreen.preventAutoHideAsync();

// Provide a single place to bootstrap auth, settings, network listeners, and routing.
export default function RootLayout() {
  const { user, isLoading } = useAuthStore();
  const theme = useTheme();
  useSystemTheme();
  const segments = useSegments();
  const router = useRouter();

  // Use the custom bootstrap hook
  const { isInitialized, initError } = useAppBootstrap();

  // Development-only logging (removed in production builds)
  React.useEffect(() => {
    if (__DEV__) {
      // Only log in development mode
    }
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
          backgroundColor: "#121212",
        }}
      >
        <Text style={{ color: "#00E676", fontSize: 18, fontWeight: "bold" }}>
          {Platform.OS === "web" ? "Loading Admin Panel..." : "Loading..."}
        </Text>
        <Text style={{ color: "#888", fontSize: 14, marginTop: 10 }}>
          Please wait
        </Text>
        <ActivityIndicator
          color="#00E676"
          style={{ marginTop: 16 }}
          size="large"
        />
        {initError && (
          <Text
            style={{
              color: "#FF5252",
              fontSize: 12,
              marginTop: 20,
              padding: 10,
              textAlign: "center",
            }}
          >
            Warning: {initError}
          </Text>
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
          backgroundColor: "#121212",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#FF5252",
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          ⚠️ Initialization Error
        </Text>
        <Text
          style={{
            color: "#888",
            fontSize: 14,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          {initError}
        </Text>
        <Text style={{ color: "#00E676", fontSize: 14, marginTop: 20 }}>
          Attempting to continue anyway...
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
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
              <Stack.Screen name="staff/history" />
              <Stack.Screen name="supervisor/dashboard" />
              <Stack.Screen name="supervisor/session-detail" />
              <Stack.Screen name="supervisor/settings" />
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
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

// ==========================================
// END OF LOGGING
// ==========================================
