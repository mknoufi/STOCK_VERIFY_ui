import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SHADOWS, withAlpha } from "../constants/theme";
import { AppHeader } from "../components/AppHeader";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ScanScreen } from "../screens/ScanScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  Scan: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function FloatingScanButton({ onPress, accessibilityState }: any) {
  const selected = Boolean(accessibilityState?.selected);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.scanBtnWrap, pressed && styles.pressed]}>
      <View style={[styles.scanBtn, selected && styles.scanBtnSelected]}>
        <Ionicons name="scan" size={24} color={COLORS.TEXT_PRIMARY} />
      </View>
    </Pressable>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <AppHeader />,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.INFO,
        tabBarInactiveTintColor: COLORS.TEXT_MUTED,
        tabBarStyle: {
          backgroundColor: COLORS.BG_CARD,
          borderTopColor: COLORS.BORDER,
          borderTopWidth: 1,
          height: 66,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size ?? 22} color={color} />,
        }}
      />

      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarStyle: { display: "none" },
          tabBarButton: (props) => <FloatingScanButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size ?? 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanBtnWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.INFO,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.TEXT_PRIMARY, 0.25),
    ...SHADOWS.FLOATING,
  },
  scanBtnSelected: {
    backgroundColor: withAlpha(COLORS.INFO, 0.95),
  },
  pressed: {
    opacity: 0.85,
  },
});
