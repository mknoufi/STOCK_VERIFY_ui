/**
 * Staff Layout - Navigation structure for staff role
 * Features:
 * - Stack-based navigation optimized for scanning workflow
 * - Quick access to scan and history
 * - Session status indicator
 */

import React from "react";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useAuthStore } from "../../src/store/authStore";

export default function StaffLayout() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const navigateToScan = () => {
    router.push("/staff/scan");
  };

  const navigateToHistory = () => {
    router.push("/staff/history");
  };

  const screenOptions = {
    headerStyle: {
      backgroundColor: auroraTheme.colors.background.primary,
    },
    headerTintColor: auroraTheme.colors.text.primary,
    headerTitleStyle: {
      fontFamily: auroraTheme.typography.fontFamily.heading,
      fontWeight: "600" as const,
    },
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: auroraTheme.colors.background.primary,
    },
  };

  return (
    <Stack screenOptions={screenOptions}>
      {/* Home Dashboard */}
      <Stack.Screen
        name="home"
        options={{
          title: "Stock Count",
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <View style={styles.roleIndicator}>
                <Ionicons name="person" size={14} color={auroraTheme.colors.accent[500]} />
                <Text style={styles.roleText}>{user?.full_name || "Staff"}</Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={navigateToScan} style={styles.scanBtn}>
                <Ionicons name="barcode-outline" size={22} color={auroraTheme.colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToHistory} style={styles.actionBtn}>
                <Ionicons name="time-outline" size={22} color={auroraTheme.colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={20} color={auroraTheme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Scanning Screen - Primary workflow */}
      <Stack.Screen
        name="scan"
        options={{
          title: "Scan Items",
          headerRight: () => (
            <TouchableOpacity onPress={navigateToHistory} style={styles.actionBtn}>
              <Ionicons name="time-outline" size={22} color={auroraTheme.colors.text.secondary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Item Details */}
      <Stack.Screen
        name="item-detail"
        options={{
          title: "Item Details",
          presentation: "modal",
        }}
      />

      {/* History */}
      <Stack.Screen
        name="history"
        options={{ title: "Scan History" }}
      />

      {/* Settings */}
      <Stack.Screen
        name="appearance"
        options={{ title: "Appearance" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  roleIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: auroraTheme.colors.accent[500] + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: auroraTheme.colors.accent[500],
    fontSize: 12,
    fontWeight: "600",
    fontFamily: auroraTheme.typography.fontFamily.body,
    maxWidth: 100,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  scanBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.primary[500] + "20",
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: auroraTheme.colors.background.tertiary,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
  },
});
