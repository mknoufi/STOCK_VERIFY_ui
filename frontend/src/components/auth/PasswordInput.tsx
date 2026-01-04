/**
 * PasswordInput Component
 * Secure text input with visibility toggle
 *
 * Features:
 * - Eye/eye-off icon toggle
 * - Haptic feedback on toggle
 * - Uses unified theme tokens
 * - Accessibility support
 */

import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colors,
  semanticColors,
  spacing,
  textStyles,
  radius,
} from "../../theme/unified";

export interface PasswordInputProps extends Omit<
  TextInputProps,
  "secureTextEntry"
> {
  /** Label text above the input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Left icon name (Ionicons) */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Whether to show the input in a disabled state */
  disabled?: boolean;
  /** Callback when visibility is toggled */
  onVisibilityChange?: (isVisible: boolean) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function PasswordInput({
  label,
  error,
  leftIcon = "lock-closed-outline",
  disabled = false,
  onVisibilityChange,
  style,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const iconScale = useSharedValue(1);

  const toggleVisibility = useCallback(() => {
    if (disabled) return;

    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate icon
    iconScale.value = withSpring(0.8, { damping: 10, stiffness: 200 });
    setTimeout(() => {
      iconScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }, 100);

    setIsVisible(!isVisible);
    onVisibilityChange?.(!isVisible);
  }, [disabled, isVisible, onVisibilityChange, iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const getBorderColor = () => {
    if (error) return colors.error[500];
    if (isFocused) return colors.primary[500];
    return semanticColors.border.default;
  };

  return (
    <View style={styles.container}>
      {label && <Animated.Text style={styles.label}>{label}</Animated.Text>}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: disabled
              ? semanticColors.background.tertiary
              : semanticColors.background.secondary,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={
              isFocused ? colors.primary[500] : semanticColors.text.tertiary
            }
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...props}
          style={[styles.input, style]}
          secureTextEntry={!isVisible}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={semanticColors.text.tertiary}
          accessibilityLabel={label || "Password"}
          accessibilityHint="Enter your password"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <AnimatedTouchable
          onPress={toggleVisibility}
          style={[styles.visibilityButton, iconAnimatedStyle]}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          accessibilityHint={
            isVisible
              ? "Double tap to hide password"
              : "Double tap to show password"
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={
              disabled
                ? semanticColors.text.disabled
                : isFocused
                  ? colors.primary[500]
                  : semanticColors.text.secondary
            }
          />
        </AnimatedTouchable>
      </View>

      {error && <Animated.Text style={styles.errorText}>{error}</Animated.Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    ...textStyles.label,
    color: semanticColors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48, // Touch target minimum
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...textStyles.body1,
    color: semanticColors.text.primary,
    paddingVertical: spacing.sm,
  },
  visibilityButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
});

export default PasswordInput;
