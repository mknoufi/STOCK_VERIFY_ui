import React, { ReactNode } from "react";
import {
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";
import { useThemeContext } from "../../context/ThemeContext";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: "elevated" | "outlined" | "filled";
  padding?: "none" | "small" | "medium" | "large";
  margin?: "none" | "small" | "medium" | "large";
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  disabled = false,
  variant = "elevated",
  padding = "medium",
  margin = "small",
  testID,
}) => {
  const { themeLegacy: theme } = useThemeContext();

  const paddingMap = {
    none: 0,
    small: theme.spacing.sm,
    medium: theme.spacing.md,
    large: theme.spacing.lg,
  };

  const marginMap = {
    none: 0,
    small: theme.spacing.sm,
    medium: theme.spacing.md,
    large: theme.spacing.lg,
  };

  const cardStyles: ViewStyle = {
    padding: paddingMap[padding],
    margin: marginMap[margin],
    zIndex: 1, // Default zIndex to avoid stacking context issues
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface, // Default background
    ...(variant === "elevated" && {
      ...theme.shadows.sm,
    }),
    ...(variant === "outlined" && {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: "transparent",
    }),
    ...(variant === "filled" && {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 0,
    }),
  };

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={[cardStyles, style]}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyles, style]} testID={testID}>
      {children}
    </View>
  );
};
