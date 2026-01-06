import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { getRouteForRole, isRouteAllowedForRole, UserRole } from "../../utils/roleNavigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, isLoading } = useAuthStore();
  const { settings } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized || isLoading || !segments?.length) return;

    const firstSegment = segments[0] as string;
    const inAuthGroup =
      firstSegment === "(auth)" ||
      firstSegment === "login" ||
      firstSegment === "welcome" ||
      firstSegment === "register" ||
      firstSegment === "help";
    const inProtectedGroup = firstSegment === "staff" || firstSegment === "supervisor" || firstSegment === "admin";

    // 1. Unauthenticated user trying to access protected routes
    if (!user && inProtectedGroup) {
      console.log("🔒 [AuthGuard] Unauthenticated access attempt. Redirecting to welcome.");
      router.replace("/welcome");
      return;
    }

    // 2. Authenticated user in public routes (login/welcome)
    if (user && inAuthGroup) {
      const targetRoute = getRouteForRole(user.role as UserRole);
      console.log(`🔒 [AuthGuard] Authenticated user in public route. Redirecting to ${targetRoute}`);
      router.replace(targetRoute as any);
      return;
    }

    // 3. Role-based access control
    if (user && inProtectedGroup) {
      const currentPath = "/" + segments.join("/");
      if (!isRouteAllowedForRole(currentPath, user.role as UserRole)) {
        const targetRoute = getRouteForRole(user.role as UserRole);
        console.warn(`🔒 [AuthGuard] Unauthorized role access. Redirecting to ${targetRoute}`);
        router.replace(targetRoute as any);
        return;
      }
    }

    // 4. Operational Mode Enforcement (Placeholder for future logic)
    if (user && settings.operationalMode === "live_audit") {
      // Example: Prevent navigation to settings or other non-audit areas if needed
      // For now, we just log it
      // console.log("🔒 [AuthGuard] Operating in Live Audit mode");
    }

  }, [user, segments, isInitialized, isLoading, settings.operationalMode, router]);

  return <>{children}</>;
}
