/**
 * PIN Keypad Component
 *
 * Features:
 * - 4-digit PIN input with large tap targets (minimum 60px)
 * - Visual feedback with filled/empty indicators
 * - Haptic feedback on key press
 * - Backspace and clear functionality
 * - Accessibility support
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../../styles/modernDesignSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const KEYPAD_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const KEY_SIZE = Math.max(60, (KEYPAD_SIZE - 32) / 3); // Minimum 60px tap target

interface PinKeypadProps {
  pin: string;
  maxLength?: number;
  onPinChange: (pin: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function PinKeypad({
  pin,
  maxLength = 4,
  onPinChange,
  onComplete,
  disabled = false,
  error = false,
}: PinKeypadProps) {
  const keys = useMemo(
    () => [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["clear", "0", "backspace"],
    ],
    [],
  );

  // Animation for error shake
  const shakeX = useSharedValue(0);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (disabled) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (key === "backspace") {
        onPinChange(pin.slice(0, -1));
      } else if (key === "clear") {
        onPinChange("");
      } else if (pin.length < maxLength) {
        const newPin = pin + key;
        onPinChange(newPin);
        if (newPin.length === maxLength && onComplete) {
          onComplete(newPin);
        }
      }
    },
    [pin, maxLength, onPinChange, onComplete, disabled],
  );

  // Trigger shake animation on error
  React.useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const renderIndicators = () => (
    <Animated.View style={[styles.indicators, indicatorStyle]}>
      {Array.from({ length: maxLength }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            pin.length > index && styles.indicatorFilled,
            error && styles.indicatorError,
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKey = (key: string, rowIndex: number, colIndex: number) => {
    const isSpecialKey = key === "backspace" || key === "clear";
    const isEmpty = key === "";

    if (isEmpty) {
      return (
        <View key={`empty-${rowIndex}-${colIndex}`} style={styles.keyEmpty} />
      );
    }

    return (
      <TouchableOpacity
        key={`key-${key}`}
        style={[
          styles.key,
          isSpecialKey && styles.keySpecial,
          disabled && styles.keyDisabled,
        ]}
        onPress={() => handleKeyPress(key)}
        disabled={disabled}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={
          key === "backspace"
            ? "Delete"
            : key === "clear"
              ? "Clear"
              : `Number ${key}`
        }
      >
        {key === "backspace" ? (
          <Ionicons
            name="backspace-outline"
            size={28}
            color={
              disabled
                ? modernColors.text.disabled
                : modernColors.text.secondary
            }
          />
        ) : key === "clear" ? (
          <Text
            style={[styles.keyTextSpecial, disabled && styles.keyTextDisabled]}
          >
            C
          </Text>
        ) : (
          <Text style={[styles.keyText, disabled && styles.keyTextDisabled]}>
            {key}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderIndicators()}
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((key, colIndex) => renderKey(key, rowIndex, colIndex))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32,
  },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: modernColors.border.medium,
    backgroundColor: "transparent",
  },
  indicatorFilled: {
    backgroundColor: modernColors.primary[500],
    borderColor: modernColors.primary[400],
  },
  indicatorError: {
    borderColor: modernColors.semantic.error,
    backgroundColor: modernColors.semantic.error,
  },
  keypad: {
    width: KEYPAD_SIZE,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  keySpecial: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyEmpty: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
  keyText: {
    fontSize: 28,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  keyTextSpecial: {
    fontSize: 20,
    fontWeight: "600",
    color: modernColors.text.secondary,
  },
  keyTextDisabled: {
    color: modernColors.text.disabled,
  },
});
