import React from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator, Platform, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { theme } from "../styles/modernDesignSystem";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  size = 24,
  color = theme.colors.primary[500],
  accessibilityLabel = "Refresh content",
  accessibilityHint = "Double tap to reload data",
  hapticFeedback = false,
  style,
  iconName = "refresh-outline",
}) => {
  const handlePress = () => {
    if (hapticFeedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRefresh();
  };

  return (
    <TouchableOpacity
      style={[styles.button, { opacity: loading ? 0.6 : 1 }, style]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={iconName} size={size} color={color} />
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
