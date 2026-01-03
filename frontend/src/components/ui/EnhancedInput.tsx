/**
 * EnhancedInput - Material Design Inspired Input Component
 *
 * Features:
 * - Floating label positions (container, border, box)
 * - Error/success states with messages
 * - Left and right icons
 * - Password visibility toggle
 * - Character counter
 * - Animated focus states
 *
 * Inspired by react-native-design-kit Input patterns
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useThemeContext } from '@/context/ThemeContext';
import {
  ComponentSizes,
  BorderRadius,
  FontSizes,
  FontWeights,
  Spacing,
  AnimationTimings,
} from '@/theme/uiConstants';

export type InputSize = 'sm' | 'md' | 'lg';
export type LabelPosition = 'floating' | 'fixed' | 'none';

export interface EnhancedInputProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label?: string;
  /** Label behavior */
  labelPosition?: LabelPosition;
  /** Helper text below input */
  helperText?: string;
  /** Error message (shows error state) */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Success message */
  successMessage?: string;
  /** Left icon */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Right icon */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Right icon press handler */
  onRightIconPress?: () => void;
  /** Input size */
  size?: InputSize;
  /** Show character counter */
  showCounter?: boolean;
  /** Maximum characters */
  maxLength?: number;
  /** Container style */
  containerStyle?: StyleProp<ViewStyle>;
  /** Input style */
  inputStyle?: StyleProp<TextStyle>;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * EnhancedInput - Beautiful text input with animations
 *
 * @example
 * // Basic usage
 * <EnhancedInput
 *   label="Email"
 *   placeholder="Enter your email"
 *   keyboardType="email-address"
 * />
 *
 * @example
 * // With error state
 * <EnhancedInput
 *   label="Password"
 *   secureTextEntry
 *   error="Password must be at least 8 characters"
 * />
 *
 * @example
 * // With icons
 * <EnhancedInput
 *   label="Search"
 *   leftIcon="search"
 *   rightIcon="close-circle"
 *   onRightIconPress={() => setValue('')}
 * />
 */
export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  labelPosition = 'floating',
  helperText,
  error,
  success,
  successMessage,
  leftIcon,
  rightIcon,
  onRightIconPress,
  size = 'md',
  showCounter = false,
  maxLength,
  containerStyle,
  inputStyle,
  disabled = false,
  fullWidth = false,
  value,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}) => {
  const { themeLegacy } = useThemeContext();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const focusProgress = useSharedValue(0);

  // Determine if label should float
  const shouldFloat = isFocused || (value && value.length > 0);

  // Size configurations
  const sizeConfig = {
    sm: {
      height: ComponentSizes.input.sm,
      fontSize: FontSizes.sm,
      iconSize: ComponentSizes.icon.sm,
      paddingHorizontal: Spacing.md,
    },
    md: {
      height: ComponentSizes.input.md,
      fontSize: FontSizes.md,
      iconSize: ComponentSizes.icon.md,
      paddingHorizontal: Spacing.base,
    },
    lg: {
      height: ComponentSizes.input.lg,
      fontSize: FontSizes.lg,
      iconSize: ComponentSizes.icon.lg,
      paddingHorizontal: Spacing.lg,
    },
  };

  const config = sizeConfig[size];

  // Colors based on state
  const getBorderColor = () => {
    if (error) return themeLegacy.colors.error || '#DC2626';
    if (success) return themeLegacy.colors.success || '#16A34A';
    if (isFocused) return themeLegacy.colors.primary;
    return themeLegacy.colors.border || 'rgba(0, 0, 0, 0.1)';
  };

  const getIconColor = () => {
    if (error) return themeLegacy.colors.error || '#DC2626';
    if (success) return themeLegacy.colors.success || '#16A34A';
    if (isFocused) return themeLegacy.colors.primary;
    return themeLegacy.colors.textSecondary || '#888';
  };

  // Handlers
  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      focusProgress.value = withTiming(1, { duration: AnimationTimings.fast });
      onFocus?.(e);
    },
    [onFocus, focusProgress]
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      focusProgress.value = withTiming(0, { duration: AnimationTimings.fast });
      onBlur?.(e);
    },
    [onBlur, focusProgress]
  );

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  // Animated label style
  const labelAnimatedStyle = useAnimatedStyle(() => {
    if (labelPosition !== 'floating') return {};

    const translateY = interpolate(
      shouldFloat ? 1 : focusProgress.value,
      [0, 1],
      [0, -(config.height / 2 + 4)]
    );
    const scale = interpolate(
      shouldFloat ? 1 : focusProgress.value,
      [0, 1],
      [1, 0.85]
    );

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Character counter
  const charCount = value?.length || 0;
  const showCounterText = showCounter && maxLength;

  // Determine if we should show password toggle
  const isPassword = secureTextEntry;
  const finalSecureEntry = isPassword && !isPasswordVisible;
  const passwordIcon = isPasswordVisible ? 'eye-off' : 'eye';

  return (
    <View
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        containerStyle,
      ]}
    >
      {/* Fixed label */}
      {label && labelPosition === 'fixed' && (
        <Text
          style={[
            styles.fixedLabel,
            { color: themeLegacy.colors.text },
            error && { color: themeLegacy.colors.error },
          ]}
        >
          {label}
        </Text>
      )}

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          {
            minHeight: config.height,
            paddingHorizontal: config.paddingHorizontal,
            borderColor: getBorderColor(),
            backgroundColor: disabled
              ? 'rgba(0, 0, 0, 0.05)'
              : themeLegacy.colors.surface || themeLegacy.colors.background,
          },
        ]}
      >
        {/* Floating label */}
        {label && labelPosition === 'floating' && (
          <AnimatedText
            style={[
              styles.floatingLabel,
              {
                color: isFocused
                  ? themeLegacy.colors.primary
                  : themeLegacy.colors.textSecondary,
                backgroundColor: themeLegacy.colors.surface || themeLegacy.colors.background,
              },
              error && { color: themeLegacy.colors.error },
              labelAnimatedStyle,
            ]}
          >
            {label}
          </AnimatedText>
        )}

        {/* Left icon */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={config.iconSize}
            color={getIconColor()}
            style={styles.leftIcon}
          />
        )}

        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              fontSize: config.fontSize,
              color: themeLegacy.colors.text,
            },
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPassword) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={themeLegacy.colors.textSecondary || '#888'}
          editable={!disabled}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={finalSecureEntry}
          maxLength={maxLength}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />

        {/* Right icon / Password toggle */}
        {(rightIcon || isPassword) && (
          <TouchableOpacity
            onPress={isPassword ? togglePasswordVisibility : onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPassword ? passwordIcon : rightIcon!}
              size={config.iconSize}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom row: helper/error text + counter */}
      <View style={styles.bottomRow}>
        {/* Helper/Error/Success text */}
        <View style={styles.helperContainer}>
          {error ? (
            <Text style={[styles.helperText, { color: themeLegacy.colors.error }]}>
              {error}
            </Text>
          ) : success && successMessage ? (
            <Text style={[styles.helperText, { color: themeLegacy.colors.success }]}>
              {successMessage}
            </Text>
          ) : helperText ? (
            <Text
              style={[
                styles.helperText,
                { color: themeLegacy.colors.textSecondary },
              ]}
            >
              {helperText}
            </Text>
          ) : null}
        </View>

        {/* Character counter */}
        {showCounterText && (
          <Text
            style={[
              styles.counter,
              { color: themeLegacy.colors.textSecondary },
              charCount >= maxLength! && { color: themeLegacy.colors.error },
            ]}
          >
            {charCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  fixedLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: Spacing.md,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.xs,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  helperContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: FontSizes.xs,
  },
  counter: {
    fontSize: FontSizes.xs,
    marginLeft: Spacing.sm,
  },
});

export default EnhancedInput;
