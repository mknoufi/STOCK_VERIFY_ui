/**
 * QuantityInput Component
 * Unified quantity input with stepper controls
 * Used across item detail and counting screens
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  longPressStep?: number;
  label?: string;
  showUOM?: boolean;
  uomName?: string;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  animationDelay?: number;
  style?: any;
}

// ============================================================================
// Main Component
// ============================================================================

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  longPressStep = 5,
  label,
  showUOM = false,
  uomName,
  disabled = false,
  size = "medium",
  animationDelay = 0,
  style,
}) => {
  const clampValue = (val: number): number => {
    if (Number.isNaN(val)) return min;
    let clamped = Math.max(min, Math.floor(val));
    if (max !== undefined) {
      clamped = Math.min(max, clamped);
    }
    return clamped;
  };

  const handleIncrement = (amount: number = step) => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newValue = clampValue(value + amount);
    onChange(newValue);
  };

  const handleDecrement = (amount: number = step) => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newValue = clampValue(value - amount);
    onChange(newValue);
  };

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const numValue = parseInt(cleaned) || 0;
    onChange(numValue);
  };

  const handleBlur = () => {
    onChange(clampValue(value));
  };

  const sizeStyles = {
    small: {
      buttonSize: 36,
      inputWidth: 60,
      inputHeight: 36,
      fontSize: 16,
      buttonFontSize: 20,
    },
    medium: {
      buttonSize: 48,
      inputWidth: 100,
      inputHeight: 48,
      fontSize: 20,
      buttonFontSize: 24,
    },
    large: {
      buttonSize: 56,
      inputWidth: 120,
      inputHeight: 56,
      fontSize: 24,
      buttonFontSize: 28,
    },
  };

  const currentSize = sizeStyles[size];

  const content = (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.controlsRow}>
        {/* Decrement Button */}
        <TouchableOpacity
          style={[
            styles.stepButton,
            {
              width: currentSize.buttonSize,
              height: currentSize.buttonSize,
              borderRadius: currentSize.buttonSize / 2,
            },
            disabled && styles.disabledButton,
          ]}
          onPress={() => handleDecrement()}
          onLongPress={() => handleDecrement(longPressStep)}
          delayLongPress={250}
          disabled={disabled || value <= min}
        >
          <Text
            style={[
              styles.stepButtonText,
              { fontSize: currentSize.buttonFontSize },
            ]}
          >
            −
          </Text>
        </TouchableOpacity>

        {/* Input Field */}
        <View
          style={[
            styles.inputContainer,
            {
              width: currentSize.inputWidth,
              height: currentSize.inputHeight,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { fontSize: currentSize.fontSize },
              disabled && styles.disabledInput,
            ]}
            value={value.toString()}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
            editable={!disabled}
            selectTextOnFocus
          />
          {showUOM && uomName && (
            <Text style={styles.uomText}>{uomName}</Text>
          )}
        </View>

        {/* Increment Button */}
        <TouchableOpacity
          style={[
            styles.stepButton,
            {
              width: currentSize.buttonSize,
              height: currentSize.buttonSize,
              borderRadius: currentSize.buttonSize / 2,
            },
            disabled && styles.disabledButton,
          ]}
          onPress={() => handleIncrement()}
          onLongPress={() => handleIncrement(longPressStep)}
          delayLongPress={250}
          disabled={disabled || (max !== undefined && value >= max)}
        >
          <Text
            style={[
              styles.stepButtonText,
              { fontSize: currentSize.buttonFontSize },
            ]}
          >
            ＋
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick adjustment buttons */}
      <View style={styles.quickAdjustRow}>
        {[1, 5, 10, 25].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.quickButton}
            onPress={() => handleIncrement(amount)}
            disabled={disabled}
          >
            <Text style={styles.quickButtonText}>+{amount}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
        {content}
      </Animated.View>
    );
  }

  return content;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  stepButton: {
    backgroundColor: theme.colors.primary[500] + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.primary[500] + "40",
  },
  stepButtonText: {
    fontWeight: "600",
    color: theme.colors.primary[500],
    marginTop: -2,
  },
  disabledButton: {
    opacity: 0.4,
  },
  inputContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    fontWeight: "700",
    color: theme.colors.text.primary,
    textAlign: "center",
    width: "100%",
  },
  disabledInput: {
    opacity: 0.5,
  },
  uomText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  quickAdjustRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  quickButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
});

export default QuantityInput;
