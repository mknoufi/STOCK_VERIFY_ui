import React, { ReactNode } from "react";
import {
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";

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

const paddingMap = {
  none: 0,
  small: 8,
  medium: 16,
  large: 24,
} as const;

const marginMap = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
} as const;

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
  const cardStyles: ViewStyle = {
    padding: paddingMap[padding],
    margin: marginMap[margin],
    backgroundColor: "white",
    borderRadius: 8,
    ...(variant === "elevated" && {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
    ...(variant === "outlined" && {
      borderWidth: 1,
      borderColor: "#e0e0e0",
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
