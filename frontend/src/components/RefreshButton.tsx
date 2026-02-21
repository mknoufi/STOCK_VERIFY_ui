import React from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  size = 24,
  color = "#4CAF50",
  accessibilityLabel = "Refresh content",
  accessibilityHint = "Reloads the current view",
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
      onPress={onRefresh}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={loading ? "Loading..." : accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name="refresh-outline" size={size} color={color} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
