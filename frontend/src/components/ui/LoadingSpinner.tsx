import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
  ActivityIndicator,
} from "react-native";
import { colorPalette } from "@/theme/designTokens";

// Conditionally import Spinner to avoid web crashes
let Spinner: any;
if (Platform.OS !== "web") {
  Spinner = require("react-native-spinkit").default;
}

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
  type?: SpinnerType;
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

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {Spinner && (
        <Spinner isVisible={isVisible} size={size} type={type} color={color} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
