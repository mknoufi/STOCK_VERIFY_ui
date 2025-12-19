import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Spinner, { SpinnerType } from "react-native-spinkit";
import { colorPalette } from "@/theme/designTokens";

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
  return (
    <View style={[styles.container, style]}>
      <Spinner isVisible={isVisible} size={size} type={type} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
