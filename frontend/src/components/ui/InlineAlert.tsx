import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

export type InlineAlertType = "error" | "warning" | "success" | "info";

interface Props {
  type?: InlineAlertType;
  message: string;
  testID?: string;
}

const ICONS: Record<InlineAlertType, keyof typeof Ionicons.glyphMap> = {
  error: "alert-circle",
  warning: "warning",
  success: "checkmark-circle",
  info: "information-circle",
};

const BG_COLORS: Record<InlineAlertType, string> = {
  error: "rgba(239, 68, 68, 0.12)",
  warning: "rgba(245, 158, 11, 0.12)",
  success: "rgba(16, 185, 129, 0.12)",
  info: "rgba(99, 102, 241, 0.12)",
};

const FG_COLORS: Record<InlineAlertType, string> = {
  error: auroraTheme.colors.error[400] ?? "#F87171",
  warning: auroraTheme.colors.warning[400] ?? "#FBBF24",
  success: auroraTheme.colors.success[400] ?? "#34D399",
  info: auroraTheme.colors.accent[400] ?? "#A78BFA",
};

export function InlineAlert({ type = "info", message, testID }: Props) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: BG_COLORS[type], borderColor: FG_COLORS[type] },
      ]}
      testID={testID}
    >
      <Ionicons
        name={ICONS[type]}
        size={18}
        color={FG_COLORS[type]}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: auroraTheme.colors.text.primary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: auroraTheme.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default InlineAlert;
