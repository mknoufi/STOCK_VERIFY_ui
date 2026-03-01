import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  testID?: string;
}

export function QuantityStepper({ value, onChange, min = 0, max, disabled, testID }: Props) {
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

  return (
    <View style={[styles.container, disabled && { opacity: 0.6 }]} testID={testID}>
      <TouchableOpacity
        onPress={() => handleChange(-1)}
        disabled={disabled || value <= min}
        style={[styles.button, (disabled || value <= min) && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityHint="Double tap to decrease value"
        accessibilityState={{ disabled: disabled || value <= min }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="remove" size={20} color={auroraTheme.colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.valueBox} accessible={true} accessibilityLiveRegion="polite">
        <Text style={styles.valueText}>{value}</Text>
      </View>

      <TouchableOpacity
        onPress={() => handleChange(1)}
        disabled={disabled || (typeof max === "number" && value >= max)}
        style={[styles.button, (disabled || (typeof max === "number" && value >= max)) && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityHint="Double tap to increase value"
        accessibilityState={{ disabled: disabled || (typeof max === "number" && value >= max) }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="add" size={20} color={auroraTheme.colors.text.primary} />
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
    backgroundColor: auroraTheme.colors.background.secondary,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.medium,
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
    borderColor: auroraTheme.colors.border.medium,
    backgroundColor: auroraTheme.colors.background.primary,
    alignItems: "center",
  },
  valueText: {
    color: auroraTheme.colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },
});

export default QuantityStepper;
