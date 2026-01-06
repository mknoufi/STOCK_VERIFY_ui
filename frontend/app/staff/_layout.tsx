/**
 * Staff Layout - Navigation structure for staff role
 * Features:
 * - Stack-based navigation optimized for scanning workflow
 * - Quick access to scan and history
 */

import React from "react";
import { Stack } from "expo-router";
import { RoleLayoutGuard } from "@/components/auth/RoleLayoutGuard";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { StaffCrashScreen } from "@/components/feedback/StaffCrashScreen";

export default function StaffLayout() {
  return (
    <RoleLayoutGuard allowedRoles={["staff"]} layoutName="StaffLayout">
      <ErrorBoundary
        fallback={(error, resetError) => (
          <StaffCrashScreen error={error} resetError={resetError} />
        )}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </RoleLayoutGuard>
  );
}

