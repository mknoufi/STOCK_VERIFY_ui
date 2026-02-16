import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import { AppNavigator } from "../src/navigation/AppNavigator";
import { COLORS } from "../src/constants/theme";

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

export default function ScaffoldRoute() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
