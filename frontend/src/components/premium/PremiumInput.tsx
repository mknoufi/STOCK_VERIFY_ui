/**
 * PremiumInput Component
 * Enhanced input field with modern styling, validation, and accessibility
 */

/// <reference types="react" />
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernAnimations,
} from "../../styles/modernDesignSystem";

// Color helpers for semantic usage
const colors = {
  error: modernColors.error.main,
  errorLight: modernColors.error.light,
  primary: modernColors.primary[500],
  textPrimary: modernColors.text.primary,
  textSecondary: modernColors.text.secondary,
  textTertiary: modernColors.text.tertiary,
  textDisabled: modernColors.text.disabled,
  borderLight: modernColors.border.light,
  backgroundDefault: modernColors.background.default,
  backgroundPaper: modernColors.background.paper,
  backgroundDisabled: modernColors.neutral[700],
};

type InputVariant = "default" | "outlined" | "filled" | "underlined";

interface PremiumInputProps {
  label?: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  variant?: InputVariant;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
  maxLength?: number;
  required?: boolean;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  variant = "outlined",
  error,
  helperText,
  disabled = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  testID,
  maxLength,
  required = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const borderColorAnim = useSharedValue(0);
  const labelScaleAnim = useSharedValue(value ? 1 : 0);

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    borderColorAnim.value = withTiming(1, {
      duration: modernAnimations.duration.fast,
    });
    labelScaleAnim.value = withTiming(1, {
      duration: modernAnimations.duration.fast,
    });
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    borderColorAnim.value = withTiming(0, {
      duration: modernAnimations.duration.fast,
    });
    if (!value) {
      labelScaleAnim.value = withTiming(0, {
        duration: modernAnimations.duration.fast,
      });
    }
  };

  // Animated border style
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : isFocused
        ? colors.primary
        : colors.borderLight;
    return { borderColor };
  });

  // Get variant styles
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "filled":
        return {
          backgroundColor: modernColors.background.paper,
          borderWidth: 0,
          borderBottomWidth: 2,
          borderRadius: modernBorderRadius.sm,
        };
      case "underlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 0,
          borderBottomWidth: 1,
          borderRadius: 0,
        };
      case "outlined":
      default:
        return {
          backgroundColor: modernColors.background.default,
          borderWidth: 1.5,
          borderRadius: modernBorderRadius.md,
        };
    }
  };

  const isPasswordField = secureTextEntry;
  const effectiveSecure = isPasswordField && !showPassword;

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          getVariantStyle(),
          animatedBorderStyle,
          disabled && styles.disabled,
          multiline && styles.multilineContainer,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={
                error
                  ? colors.error
                  : isFocused
                    ? colors.primary
                    : colors.textTertiary
              }
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={modernColors.text.disabled}
          editable={editable && !disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID={testID}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPasswordField) && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
        />

        {/* Right Icon / Password Toggle */}
        {(rightIcon || isPasswordField) && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={
              isPasswordField
                ? () => setShowPassword(!showPassword)
                : onRightIconPress
            }
            disabled={!isPasswordField && !onRightIconPress}
          >
            <Ionicons
              name={
                isPasswordField
                  ? showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                  : rightIcon!
              }
              size={20}
              color={
                error
                  ? colors.error
                  : isFocused
                    ? colors.primary
                    : colors.textTertiary
              }
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Helper Text / Error */}
      {(helperText || error) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: modernSpacing.sm,
  },
  labelContainer: {
    marginBottom: modernSpacing.xs,
  },
  label: {
    ...modernTypography.label.medium,
    color: colors.textSecondary,
  },
  labelError: {
    color: colors.error,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: modernSpacing.sm,
  },
  multilineContainer: {
    minHeight: 80,
    alignItems: "flex-start",
    paddingVertical: modernSpacing.sm,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.backgroundDisabled,
  },
  input: {
    flex: 1,
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    paddingVertical: modernSpacing.xs,
  },
  inputWithLeftIcon: {
    marginLeft: modernSpacing.xs,
  },
  inputWithRightIcon: {
    marginRight: modernSpacing.xs,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  iconContainer: {
    padding: modernSpacing.xs,
  },
  helperText: {
    ...modernTypography.label.small,
    color: colors.textTertiary,
    marginTop: modernSpacing.xs,
    marginLeft: modernSpacing.xs,
  },
  errorText: {
    color: colors.error,
  },
});

export type { PremiumInputProps, InputVariant };
