import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernTypography,
  modernBorderRadius,
  modernSpacing,
  modernLayout,
} from "../../styles/modernDesignSystem";

interface PremiumInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const PremiumInput = React.forwardRef<TextInput, PremiumInputProps>(
  (
    {
      label,
      error,
      icon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = React.useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
      setIsFocused(true);
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
      if (onBlur) onBlur(e);
    };

    const borderColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error ? modernColors.error.main : modernColors.border.light,
        error ? modernColors.error.main : modernColors.primary[500],
      ],
    });

    const borderWidth = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}

        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor,
              borderWidth,
            },
          ]}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={
                isFocused
                  ? modernColors.primary[500]
                  : modernColors.text.tertiary
              }
              style={styles.icon}
            />
          )}

          <TextInput
            style={[styles.input, style]}
            placeholderTextColor={modernColors.text.disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={20}
              color={modernColors.text.tertiary}
              style={styles.rightIcon}
              onPress={onRightIconPress}
            />
          )}
        </Animated.View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle"
              size={14}
              color={modernColors.error.main}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  },
);

PremiumInput.displayName = "PremiumInput";

const styles = StyleSheet.create({
  container: {
    marginBottom: modernSpacing.md,
  },
  label: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.input,
    height: modernLayout.inputHeight,
    paddingHorizontal: modernSpacing.inputPadding,
  },
  input: {
    flex: 1,
    color: modernColors.text.primary,
    ...modernTypography.body.medium,
    height: "100%",
  },
  icon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 4,
    gap: 4,
  },
  errorText: {
    ...modernTypography.label.small,
    color: modernColors.error.main,
  },
});
