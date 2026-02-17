/**
 * Checkbox Component
 * Multiple selection checkboxes
 * Phase 2: Design System - Core Components
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from "@/theme/designTokens";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  indeterminate = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scale = useSharedValue(checked || indeterminate ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(checked || indeterminate ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [checked, indeterminate, scale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: indeterminate ? "mixed" : checked,
        disabled,
      }}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
    >
      <View
        style={[
          styles.checkbox,
          (checked || indeterminate) && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        <Animated.View style={checkmarkStyle}>
          <Ionicons
            name={indeterminate ? "remove" : "checkmark"}
            size={16}
            color={colorPalette.neutral[0]}
          />
        </Animated.View>
      </View>

      {(label || description) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.label, disabled && styles.labelDisabled]}>
              {label}
            </Text>
          )}

          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: touchTargets.minimum,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colorPalette.neutral[400],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 2,
    backgroundColor: colorPalette.neutral[0],
  },
  checkboxChecked: {
    borderColor: colorPalette.primary[500],
    backgroundColor: colorPalette.primary[500],
  },
  checkboxDisabled: {
    borderColor: colorPalette.neutral[300],
    backgroundColor: colorPalette.neutral[100],
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
