import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { COLORS } from "./src/constants/theme";
import { AppNavigator } from "./src/navigation/AppNavigator";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.BG_MAIN,
    card: COLORS.BG_CARD,
    text: COLORS.TEXT_PRIMARY,
    border: COLORS.BORDER,
    primary: COLORS.INFO,
    notification: COLORS.WARNING,
  },
} as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
