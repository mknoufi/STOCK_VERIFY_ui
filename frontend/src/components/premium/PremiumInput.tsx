/**
 * PremiumInput Component
 * Enhanced input field with modern styling, validation, and accessibility
 */

/// <reference types="react" />
import React, { useState, useMemo, useCallback } from "react";
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
import { useThemeContextSafe } from "@/context/ThemeContext";

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
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  autoCorrect?: boolean;
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
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
  autoCapitalize = "none",
  autoCorrect = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  testID,
  maxLength,
  required = false,
  onBlur,
  onSubmitEditing,
  returnKeyType,
}) => {
  const themeContext = useThemeContextSafe();
  const theme = themeContext?.theme;

  // Color helpers for semantic usage
  const colors = useMemo(
    () => ({
      error: theme ? theme.colors.danger : modernColors.error.main,
      errorLight: theme ? theme.colors.error.light : modernColors.error.light,
      primary: theme ? theme.colors.accent : modernColors.primary[500],
      textPrimary: theme ? theme.colors.text.primary : modernColors.text.primary,
      textSecondary: theme
        ? theme.colors.text.secondary
        : modernColors.text.secondary,
      textTertiary: theme ? theme.colors.text.tertiary : modernColors.text.tertiary,
      textDisabled: theme ? theme.colors.text.disabled : modernColors.text.disabled,
      borderLight: theme ? theme.colors.border.light : modernColors.border.light,
      backgroundDefault: theme
        ? theme.colors.background.default
        : modernColors.background.default,
      backgroundPaper: theme
        ? theme.colors.background.paper
        : modernColors.background.paper,
      backgroundDisabled: theme
        ? theme.colors.background.paper
        : modernColors.neutral[700],
      backgroundInput: theme
        ? theme.colors.background.default
        : modernColors.background.default,
      borderFocused: theme ? theme.colors.accent : modernColors.primary[500],
    }),
    [theme],
  );

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const borderColorAnim = useSharedValue(0);
  const labelScaleAnim = useSharedValue(value ? 1 : 0);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    borderColorAnim.value = withTiming(1, {
      duration: modernAnimations.duration.fast,
    });
    labelScaleAnim.value = withTiming(1, {
      duration: modernAnimations.duration.fast,
    });
  }, [borderColorAnim, labelScaleAnim]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    borderColorAnim.value = withTiming(0, {
      duration: modernAnimations.duration.fast,
    });
    if (!value) {
      labelScaleAnim.value = withTiming(0, {
        duration: modernAnimations.duration.fast,
      });
    }
    onBlur?.();
  }, [value, onBlur, borderColorAnim, labelScaleAnim]);

  // Animated border style
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : isFocused
        ? colors.borderFocused
        : colors.borderLight;
    return { borderColor };
  });

  // Get variant styles
  const variantStyle = useMemo((): ViewStyle => {
    switch (variant) {
      case "filled":
        return {
          backgroundColor: colors.backgroundPaper,
          borderWidth: 0,
          borderBottomWidth: 2,
          borderRadius: theme ? theme.borderRadius.sm : modernBorderRadius.sm,
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
          backgroundColor: colors.backgroundInput,
          borderWidth: 1.5,
          borderRadius: theme ? theme.borderRadius.md : modernBorderRadius.md,
        };
    }
  }, [variant, colors, theme]);

  const isPasswordField = secureTextEntry;
  const effectiveSecure = isPasswordField && !showPassword;

  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        marginBottom: theme ? theme.spacing.sm : modernSpacing.sm,
      },
      label: {
        ...modernTypography.label.medium,
        color: colors.textSecondary,
        marginBottom: theme ? theme.spacing.xs : modernSpacing.xs,
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
        paddingHorizontal: theme ? theme.spacing.sm : modernSpacing.sm,
      },
      multilineContainer: {
        minHeight: 80,
        alignItems: "flex-start",
        paddingVertical: theme ? theme.spacing.sm : modernSpacing.sm,
      },
      disabled: {
        opacity: 0.5,
        backgroundColor: colors.backgroundDisabled,
      },
      input: {
        flex: 1,
        ...modernTypography.body.medium,
        color: colors.textPrimary,
        paddingVertical: theme ? theme.spacing.xs : modernSpacing.xs,
        textAlignVertical: multiline ? "top" : "center",
      },
      inputWithLeftIcon: {
        marginLeft: theme ? theme.spacing.xs : modernSpacing.xs,
      },
      inputWithRightIcon: {
        marginRight: theme ? theme.spacing.xs : modernSpacing.xs,
      },
      iconContainer: {
        padding: theme ? theme.spacing.xs : modernSpacing.xs,
      },
      helperText: {
        ...modernTypography.label.small,
        color: colors.textTertiary,
        marginTop: theme ? theme.spacing.xs : modernSpacing.xs,
        marginLeft: theme ? theme.spacing.xs : modernSpacing.xs,
      },
      errorText: {
        color: colors.error,
      },
    });
  }, [theme, colors, multiline]);

  return (
    <View style={[dynamicStyles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={[dynamicStyles.label, error && dynamicStyles.labelError]}>
          {label}
          {required && <Text style={dynamicStyles.required}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          dynamicStyles.inputContainer,
          variantStyle,
          animatedBorderStyle,
          disabled && dynamicStyles.disabled,
          multiline && dynamicStyles.multilineContainer,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={dynamicStyles.iconContainer}>
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
          placeholderTextColor={colors.textDisabled}
          editable={editable && !disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          testID={testID}
          style={[
            dynamicStyles.input,
            leftIcon && dynamicStyles.inputWithLeftIcon,
            (rightIcon || isPasswordField) && dynamicStyles.inputWithRightIcon,
            inputStyle,
          ]}
        />

        {/* Right Icon / Password Toggle */}
        {(rightIcon || isPasswordField) && (
          <TouchableOpacity
            style={dynamicStyles.iconContainer}
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
        <Text
          style={[dynamicStyles.helperText, error && dynamicStyles.errorText]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

export type { PremiumInputProps, InputVariant };
