import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { colorPalette } from "@/theme/designTokens";

export type SpinnerType =
  | "CircleFlip"
  | "Bounce"
  | "Wave"
  | "WanderingCubes"
  | "Pulse"
  | "ChasingDots"
  | "ThreeBounce"
  | "Circle"
  | "9CubeGrid"
  | "FadingCircle"
  | "FadingCircleAlt"
  | "Arc"
  | "ArcAlt";

interface LoadingSpinnerProps {
  isVisible?: boolean;
  size?: number;
  type?: SpinnerType; // Kept for compatibility but ignored
  color?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  isVisible = true,
  size = 37,
  type = "ThreeBounce",
  color = colorPalette.primary[500],
  style,
}) => {
  if (!isVisible) return null;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size > 20 ? "large" : "small"} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
