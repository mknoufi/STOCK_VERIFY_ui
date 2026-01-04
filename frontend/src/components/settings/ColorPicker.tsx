/**
 * ColorPicker - Theme color selection component
 * Allows users to choose their preferred primary color for the app theme
 */

import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { auroraTheme } from "../../theme/auroraTheme";

// Predefined color palette options
export const COLOR_PALETTE = [
  { id: "aurora", label: "Aurora", color: "#6366F1", textColor: "#FFFFFF" },
  { id: "ocean", label: "Ocean", color: "#0EA5E9", textColor: "#FFFFFF" },
  { id: "emerald", label: "Emerald", color: "#10B981", textColor: "#FFFFFF" },
  { id: "sunset", label: "Sunset", color: "#F59E0B", textColor: "#000000" },
  { id: "rose", label: "Rose", color: "#F43F5E", textColor: "#FFFFFF" },
  { id: "violet", label: "Violet", color: "#8B5CF6", textColor: "#FFFFFF" },
  { id: "slate", label: "Slate", color: "#64748B", textColor: "#FFFFFF" },
  { id: "teal", label: "Teal", color: "#14B8A6", textColor: "#FFFFFF" },
] as const;

export type ColorId = (typeof COLOR_PALETTE)[number]["id"];

interface ColorPickerProps {
  value: string; // Color hex or id
  onValueChange: (color: string, colorId: ColorId) => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ColorSwatch: React.FC<{
  color: (typeof COLOR_PALETTE)[number];
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}> = ({ color, isSelected, onPress, disabled }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isSelected ? 1.1 : 1, {
          damping: 15,
          stiffness: 200,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (!disabled) {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }
      }}
      style={[animatedStyle, styles.swatchContainer]}
      disabled={disabled}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: color.color },
          isSelected && styles.selectedSwatch,
          disabled && styles.disabledSwatch,
        ]}
      >
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={color.textColor} />
        )}
      </View>
      <Text
        style={[
          styles.swatchLabel,
          isSelected && styles.selectedSwatchLabel,
          disabled && styles.disabledLabel,
        ]}
        numberOfLines={1}
      >
        {color.label}
      </Text>
    </AnimatedPressable>
  );
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  // Find the matching color (by hex or id)
  const selectedColor = COLOR_PALETTE.find(
    (c) => c.color === value || c.id === value,
  );
  const selectedId = selectedColor?.id || "aurora";

  const handleColorSelect = (color: (typeof COLOR_PALETTE)[number]) => {
    onValueChange(color.color, color.id as ColorId);
  };

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons
            name="color-palette-outline"
            size={18}
            color={
              disabled
                ? auroraTheme.colors.text.tertiary
                : auroraTheme.colors.text.primary
            }
          />
          <Text style={[styles.label, disabled && styles.disabledLabel]}>
            Primary Color
          </Text>
        </View>
        <View style={styles.selectedPreview}>
          <View
            style={[
              styles.previewDot,
              {
                backgroundColor: selectedColor?.color || COLOR_PALETTE[0].color,
              },
            ]}
          />
          <Text
            style={[styles.selectedLabel, disabled && styles.disabledLabel]}
          >
            {selectedColor?.label || "Aurora"}
          </Text>
        </View>
      </View>

      <View style={styles.paletteContainer}>
        {COLOR_PALETTE.map((color) => (
          <ColorSwatch
            key={color.id}
            color={color}
            isSelected={selectedId === color.id}
            onPress={() => handleColorSelect(color)}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.md,
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
  selectedPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedLabel: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.primary[400],
    fontWeight: "600",
  },
  paletteContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
    justifyContent: "flex-start",
  },
  swatchContainer: {
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    width: 64,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: auroraTheme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedSwatch: {
    borderColor: auroraTheme.colors.text.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledSwatch: {
    opacity: 0.5,
  },
  swatchLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    textAlign: "center",
  },
  selectedSwatchLabel: {
    color: auroraTheme.colors.text.primary,
    fontWeight: "600",
  },
});

export default ColorPicker;
