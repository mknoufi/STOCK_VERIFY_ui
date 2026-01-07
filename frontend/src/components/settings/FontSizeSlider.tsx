/**
 * FontSizeSlider - Accessible font size adjustment component
 * Allows users to customize their preferred font size for better readability
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { auroraTheme } from "../../theme/auroraTheme";

interface FontSizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
}

const FONT_SIZE_LABELS: Record<number, string> = {
  12: "Extra Small",
  14: "Small",
  16: "Medium",
  18: "Large",
  20: "Extra Large",
  22: "Huge",
};

export const FontSizeSlider: React.FC<FontSizeSliderProps> = ({
  value,
  onValueChange,
  minValue = 12,
  maxValue = 22,
  step = 2,
  disabled = false,
}) => {
  const handleValueChange = (newValue: number) => {
    // Snap to step values
    const snappedValue = Math.round(newValue / step) * step;

    // Only trigger haptics and callback when value actually changes
    if (snappedValue !== value) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      onValueChange(snappedValue);
    }
  };

  const getSizeLabel = (): string => {
    return FONT_SIZE_LABELS[value] || `${value}pt`;
  };

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons
            name="text-outline"
            size={18}
            color={
              disabled
                ? auroraTheme.colors.text.tertiary
                : auroraTheme.colors.text.primary
            }
          />
          <Text style={[styles.label, disabled && styles.disabledLabel]}>
            Font Size
          </Text>
        </View>
        <Text style={[styles.valueLabel, disabled && styles.disabledLabel]}>
          {getSizeLabel()}
        </Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={[styles.minMaxLabel, { fontSize: minValue }]}>A</Text>

        <Slider
          style={styles.slider}
          value={value}
          onValueChange={handleValueChange}
          minimumValue={minValue}
          maximumValue={maxValue}
          step={step}
          minimumTrackTintColor={auroraTheme.colors.primary[500]}
          maximumTrackTintColor={auroraTheme.colors.neutral[600]}
          thumbTintColor={auroraTheme.colors.primary[400]}
          disabled={disabled}
        />

        <Text style={[styles.minMaxLabel, { fontSize: maxValue }]}>A</Text>
      </View>

      {/* Preview Text */}
      <View style={styles.previewContainer}>
        <Text
          style={[
            styles.previewText,
            { fontSize: value },
            disabled && styles.disabledLabel,
          ]}
        >
          Sample Text Preview
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.sm,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
  },
  label: {
    fontSize: auroraTheme.typography.fontSize.base,
    fontWeight: "500",
    color: auroraTheme.colors.text.primary,
  },
  disabledLabel: {
    color: auroraTheme.colors.text.tertiary,
  },
  valueLabel: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.primary[400],
    fontWeight: "600",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  minMaxLabel: {
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary,
    width: 28,
    textAlign: "center",
  },
  previewContainer: {
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.sm,
    alignItems: "center",
  },
  previewText: {
    color: auroraTheme.colors.text.primary,
    fontFamily: auroraTheme.typography.fontFamily.body,
  },
});

export default FontSizeSlider;
