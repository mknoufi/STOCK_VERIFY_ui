import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, METRICS } from "../constants/theme";

const OPTIONS = [
  { key: "force_sync", label: "Force Sync", icon: "cloud-download" as const },
  { key: "clear_cache", label: "Clear Cache", icon: "trash" as const },
  { key: "scanner_sensitivity", label: "Scanner Sensitivity", icon: "speedometer" as const },
  { key: "offline_mode", label: "Offline Mode", icon: "cloud-offline" as const },
  { key: "notifications", label: "Notifications", icon: "notifications" as const },
  { key: "about", label: "About", icon: "information-circle" as const },
];

export function SettingsScreen() {
  const onPress = (key: string) => {
    switch (key) {
      case "force_sync":
        Alert.alert("Force Sync", "Sync requested. This may take a moment.");
        break;
      case "clear_cache":
        Alert.alert("Clear Cache", "Cache cleared successfully.");
        break;
      case "scanner_sensitivity":
        Alert.alert("Scanner Sensitivity", "Current setting: Medium");
        break;
      case "offline_mode":
        Alert.alert("Offline Mode", "Toggle offline mode in your device settings.");
        break;
      case "notifications":
        Alert.alert("Notifications", "Notifications are enabled.");
        break;
      case "about":
        Alert.alert("About", "Stock Verify v1.0.0\nIndustrial Standard Edition");
        break;
      default:
        break;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: METRICS.SPACING_4 }}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => onPress(opt.key)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.left}>
              <View style={styles.iconWrap}>
                <Ionicons name={opt.icon} size={18} color={COLORS.INFO} />
              </View>
              <Text style={styles.label}>{opt.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.TEXT_MUTED} />
          </Pressable>
        ))}
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.copyright}>© 2026 Stock Verify</Text>
      </View>
    </ScrollView>
  );
}

// Default export for compatibility
export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_MAIN,
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: METRICS.SPACING_4,
  },
  list: {
    gap: METRICS.SPACING_3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: METRICS.RADIUS_LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: METRICS.SPACING_4,
    paddingVertical: METRICS.SPACING_4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: METRICS.SPACING_3,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  label: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    marginTop: METRICS.SPACING_6,
    alignItems: "center",
    paddingVertical: METRICS.SPACING_4,
  },
  version: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
  },
  copyright: {
    color: COLORS.TEXT_MUTED,
    fontSize: 10,
    marginTop: 4,
  },
});
