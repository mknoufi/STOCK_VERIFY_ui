/**
 * Modern Input Component for Lavanya Mart Stock Verify
 * Accessible form input with modern design principles
 */

import React, { useState, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../theme/modernDesign";

interface ModernInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  required?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  maxLength,
  multiline = false,
  numberOfLines = 1,
  icon,
  onIconPress,
  rightIcon,
  onRightIconPress,
  onSubmitEditing,
  returnKeyType,
  required = false,
  style,
  inputStyle,
  containerStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isPassword = secureTextEntry;
  const showPasswordToggle = isPassword && value.length > 0;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getInputContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      backgroundColor: disabled ? colors.gray[50] : colors.white,
      flexDirection: "row",
      alignItems: multiline ? "flex-start" : "center",
      paddingHorizontal: spacing.md,
      paddingVertical: multiline ? spacing.md : spacing.sm,
      minHeight: multiline ? 80 : 50,
    };

    // Border color logic
    if (error) {
      baseStyles.borderColor = colors.error[500];
      baseStyles.backgroundColor = colors.error[50];
    } else if (isFocused) {
      baseStyles.borderColor = colors.primary[500];
      baseStyles.backgroundColor = colors.primary[50];
    } else {
      baseStyles.borderColor = colors.gray[300];
    }

    // Shadow for focused state
    if (isFocused && !error) {
      Object.assign(baseStyles, shadows.sm);
    }

    return baseStyles;
  };

  const getInputStyles = (): TextStyle => {
    return {
      flex: 1,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      color: disabled ? colors.gray[500] : colors.gray[900],
      paddingTop: multiline ? spacing.xs : 0,
      textAlignVertical: multiline ? "top" : "center",
    };
  };

  const getLabelStyles = (): TextStyle => {
    return {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: error ? colors.error[600] : colors.gray[700],
      marginBottom: spacing.xs,
    };
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={getLabelStyles()}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <Pressable
        style={[getInputContainerStyles(), style]}
        onPress={() => inputRef.current?.focus()}
      >
        {icon && (
          <TouchableOpacity
            onPress={onIconPress}
            style={styles.iconContainer}
            disabled={!onIconPress}
          >
            <Ionicons
              name={icon}
              size={20}
              color={error ? colors.error[500] : colors.gray[500]}
            />
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={[getInputStyles(), inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={isPassword && !isPasswordVisible}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />

        {showPasswordToggle && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.iconContainer}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={colors.gray[500]}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !showPasswordToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconContainer}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}

      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  iconContainer: {
    padding: spacing.xs,
  },
  required: {
    color: colors.error[500],
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
});
export default ModernInput;
