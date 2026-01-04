/**
 * Radio Component
 * Single selection radio buttons
 * Phase 2: Design System - Core Components
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  typography,
  touchTargets,
} from "@/theme/designTokens";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const Radio: React.FC<RadioProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <RadioItem
          key={option.value}
          option={option}
          selected={value === option.value}
          onSelect={() => onChange(option.value)}
          disabled={disabled || option.disabled}
        />
      ))}
    </View>
  );
};

interface RadioItemProps {
  option: RadioOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const RadioItem: React.FC<RadioItemProps> = ({
  option,
  selected,
  onSelect,
  disabled = false,
}) => {
  const scale = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [selected, scale]);

  const innerCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
          disabled && styles.radioDisabled,
        ]}
      >
        <Animated.View
          style={[
            styles.radioInner,
            selected && styles.radioInnerSelected,
            innerCircleStyle,
          ]}
        />
      </View>

      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {option.label}
        </Text>

        {option.description && (
          <Text style={styles.description}>{option.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: touchTargets.minimum,
    paddingVertical: spacing.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colorPalette.neutral[400],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colorPalette.primary[500],
  },
  radioDisabled: {
    borderColor: colorPalette.neutral[300],
    backgroundColor: colorPalette.neutral[100],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  radioInnerSelected: {
    backgroundColor: colorPalette.primary[500],
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colorPalette.neutral[900],
  },
  labelDisabled: {
    color: colorPalette.neutral[400],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colorPalette.neutral[600],
    marginTop: spacing.xs,
  },
});
