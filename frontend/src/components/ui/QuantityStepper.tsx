import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../context/ThemeContext";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  testID?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  disabled,
  testID,
}: Props) {
  const { themeLegacy: theme } = useThemeContext();

  const clamp = (n: number) => {
    const lower = Math.max(min, isFinite(min) ? min : 0);
    const upper = typeof max === "number" ? max : Number.POSITIVE_INFINITY;
    return Math.min(Math.max(n, lower), upper);
  };

  const handleChange = (delta: number) => {
    const next = clamp(value + delta);
    if (next !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(next);
    }
  };

  const buttonStyle = {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  };

  return (
    <View
      style={[styles.container, disabled && { opacity: 0.6 }]}
      testID={testID}
    >
      <TouchableOpacity
        onPress={() => handleChange(-1)}
        disabled={disabled || value <= min}
        style={[
          styles.button,
          buttonStyle,
          (disabled || value <= min) && styles.buttonDisabled,
        ]}
        accessibilityLabel="decrement"
      >
        <Ionicons name="remove" size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <View
        style={[
          styles.valueBox,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Text style={[styles.valueText, { color: theme.colors.text }]}>
          {value}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleChange(1)}
        disabled={disabled || (typeof max === "number" && value >= max)}
        style={[
          styles.button,
          buttonStyle,
          (disabled || (typeof max === "number" && value >= max)) &&
            styles.buttonDisabled,
        ]}
        accessibilityLabel="increment"
      >
        <Ionicons name="add" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  valueBox: {
    minWidth: 56,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  valueText: {
    fontSize: 18,
    fontWeight: "700",
  },
});

export default QuantityStepper;
