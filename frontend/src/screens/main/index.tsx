import React from "react";
import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";

// Direct users to the login screen; role-based redirects happen in _layout.
// On web, if already logged in as admin, go directly to admin panel
export default function Index() {
  const { user, isLoading } = useAuthStore();

  // TEST: Verify this file is being loaded
  React.useEffect(() => {
    __DEV__ &&
      console.log("🔵 [INDEX] index.tsx is loading...", {
        user: user ? { role: user.role } : null,
        isLoading,
      });
    __DEV__ && console.log("🔵 [INDEX] About to redirect...");
  }, [user, isLoading]);

  // Wait for auth to load before redirecting
  if (isLoading) {
    return null; // Let _layout show loading screen
  }

  // On web, if admin/supervisor is logged in, go to admin control panel
  if (
    Platform.OS === "web" &&
    user &&
    (user.role === "admin" || user.role === "supervisor")
  ) {
    __DEV__ && console.log("🔄 [INDEX] Redirecting to /admin/control-panel");
    return <Redirect href={"/admin/control-panel" as any} />;
  }

  // For mobile, if user is logged in, let _layout handle the redirect
  // Otherwise go to welcome
  if (user) {
    __DEV__ &&
      console.log(
        "🔄 [INDEX] User logged in, redirecting to welcome (will be handled by _layout)",
      );
  } else {
    __DEV__ && console.log("🔄 [INDEX] No user, redirecting to /welcome");
  }

  return <Redirect href="/welcome" />;
}
