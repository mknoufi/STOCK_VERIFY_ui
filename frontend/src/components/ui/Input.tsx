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
            borderColor: hasError ? '#FF3B30' : editable ? '#C7C7CC' : '#E5E5E5',
            borderRadius: 8,
            backgroundColor: editable ? '#FFFFFF' : '#F5F5F5',
          };
        case 'filled':
          return {
            ...baseStyles,
            backgroundColor: editable ? '#F2F2F7' : '#E5E5E5',
            borderRadius: 8,
            borderBottomWidth: 2,
            borderBottomColor: hasError ? '#FF3B30' : '#007AFF',
          };
        case 'underlined':
          return {
            ...baseStyles,
            borderBottomWidth: 1,
            borderBottomColor: hasError ? '#FF3B30' : '#C7C7CC',
            paddingHorizontal: 0,
          };
        default:
          return baseStyles;
      }
    };

    return (
      <View style={containerStyle}>
        {label && (
          <Text style={[{ fontSize: 14, marginBottom: 4, color: '#666' }, labelStyle]}>
            {label}
            {required && <Text style={{ color: '#FF3B30' }}> *</Text>}
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
                color: editable ? '#000' : '#666',
                paddingHorizontal: leftIcon || rightIcon ? 8 : 0,
              },
              inputStyle,
            ]}
            editable={editable}
            placeholderTextColor="#999"
            {...textInputProps}
          />
          {rightIcon}
        </View>

        {error && (
          <Text style={[{ fontSize: 12, color: '#FF3B30', marginTop: 4 }, errorStyle]}>
            {error}
          </Text>
        )}

        {helperText && !error && (
          <Text style={[{ fontSize: 12, color: '#666', marginTop: 4 }, helperTextStyle]}>
            {helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
