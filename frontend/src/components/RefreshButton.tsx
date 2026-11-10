import React from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  size = 24,
  color = "#4CAF50",
  accessibilityLabel = "Refresh",
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
      onPress={onRefresh}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      <View style={{ opacity: loading ? 0 : 1 }}>
        <Ionicons name="refresh-outline" size={size} color={color} />
      </View>
      {loading && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <ActivityIndicator size="small" color={color} style={styles.spinner} />
        </View>
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
  spinner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
