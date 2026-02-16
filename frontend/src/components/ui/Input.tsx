import React, { ReactNode, forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeContext } from '../../theme/ThemeContext';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  helperTextStyle?: StyleProp<TextStyle>;
  variant?: 'outlined' | 'filled' | 'underlined';
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
}

const sizeMap = {
  small: { fontSize: 14, paddingVertical: 8, paddingHorizontal: 12 },
  medium: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 16 },
  large: { fontSize: 18, paddingVertical: 16, paddingHorizontal: 20 },
} as const;

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      helperTextStyle,
      variant = 'outlined',
      size = 'medium',
      required = false,
      editable = true,
      ...textInputProps
    },
    ref
  ) => {
    const { theme } = useThemeContext();
    const sizeStyles = sizeMap[size];
    const hasError = Boolean(error);

    const getInputContainerStyles = (): ViewStyle => {
      const baseStyles: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        ...sizeStyles,
      };

      switch (variant) {
        case 'outlined':
          return {
            ...baseStyles,
            borderWidth: 1,
            borderColor: hasError
              ? theme.colors.danger
              : editable
                ? theme.colors.border
                : theme.colors.borderLight,
            borderRadius: 8,
            backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceElevated,
          };
        case 'filled':
          return {
            ...baseStyles,
            backgroundColor: editable ? theme.colors.surfaceElevated : theme.colors.borderLight,
            borderRadius: 8,
            borderBottomWidth: 2,
            borderBottomColor: hasError ? theme.colors.danger : theme.colors.accent,
          };
        case 'underlined':
          return {
            ...baseStyles,
            borderBottomWidth: 1,
            borderBottomColor: hasError ? theme.colors.danger : theme.colors.border,
            paddingHorizontal: 0,
          };
        default:
          return baseStyles;
      }
    };

    return (
      <View style={containerStyle}>
        {label && (
          <Text
            style={[
              { fontSize: 14, marginBottom: 4, color: theme.colors.textSecondary },
              labelStyle,
            ]}
          >
            {label}
            {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
          </Text>
        )}

        <View style={getInputContainerStyles()}>
          {leftIcon}
          <TextInput
            ref={ref}
            style={[
              {
                flex: 1,
                fontSize: sizeStyles.fontSize,
                color: editable ? theme.colors.text : theme.colors.textSecondary,
                paddingHorizontal: leftIcon || rightIcon ? 8 : 0,
              },
              inputStyle,
            ]}
            editable={editable}
            placeholderTextColor={theme.colors.muted}
            {...textInputProps}
          />
          {rightIcon}
        </View>

        {error && (
          <Text
            style={[
              { fontSize: 12, color: theme.colors.danger, marginTop: 4 },
              errorStyle,
            ]}
          >
            {error}
          </Text>
        )}

        {helperText && !error && (
          <Text
            style={[
              { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
              helperTextStyle,
            ]}
          >
            {helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
