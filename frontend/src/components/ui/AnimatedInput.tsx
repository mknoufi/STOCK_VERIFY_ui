/**
 * AnimatedInput Component
 * Input field with smooth focus animations and haptic feedback
 * Inspired by rnx-ui input patterns
 */

import React, { useState, useRef, useCallback } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { modernColors, modernBorderRadius } from "../../styles/modernDesignSystem";

interface AnimatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  hapticOnFocus?: boolean;
  variant?: "default" | "filled" | "outlined";
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  hapticOnFocus = true,
  variant = "outlined",
  onFocus,
  onBlur,
  value,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const borderColor = useRef(new Animated.Value(0)).current;
  const labelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;
  const labelScale = useRef(new Animated.Value(value ? 0.85 : 1)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);

      // Haptic feedback on focus
      if (hapticOnFocus) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Animate border and label
      Animated.parallel([
        Animated.timing(borderColor, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(labelPosition, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(labelScale, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(shadowOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      onFocus?.(e);
    },
    [borderColor, labelPosition, labelScale, shadowOpacity, hapticOnFocus, onFocus]
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);

      // Animate back if no value
      Animated.parallel([
        Animated.timing(borderColor, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(labelPosition, {
          toValue: value ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(labelScale, {
          toValue: value ? 0.85 : 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(shadowOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      onBlur?.(e);
    },
    [borderColor, labelPosition, labelScale, shadowOpacity, value, onBlur]
  );

  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? modernColors.error.main : modernColors.border.medium,
      error ? modernColors.error.main : modernColors.primary[500],
    ],
  });

  const animatedLabelY = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -8],
  });

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "filled":
        return {
          backgroundColor: isFocused
            ? modernColors.background.paper
            : modernColors.background.elevated,
          borderWidth: 0,
          borderBottomWidth: 2,
          borderRadius: modernBorderRadius.md,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        };
      case "outlined":
      default:
        return {
          backgroundColor: modernColors.background.paper,
          borderWidth: 1.5,
          borderRadius: modernBorderRadius.md,
        };
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.inputContainer,
          getVariantStyles(),
          {
            borderColor: animatedBorderColor,
            shadowOpacity: shadowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.1],
            }),
          },
        ]}
      >
        {label && (
          <Animated.Text
            style={[
              styles.label,
              labelStyle,
              {
                transform: [
                  { translateY: animatedLabelY },
                  { scale: labelScale },
                ],
                color: isFocused
                  ? modernColors.primary[500]
                  : error
                    ? modernColors.error.main
                    : modernColors.text.secondary,
              },
            ]}
          >
            {label}
          </Animated.Text>
        )}
        <TextInput
          {...props}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            props.style,
            { paddingTop: label ? 20 : 12 },
          ]}
          placeholderTextColor={modernColors.text.tertiary}
        />
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    position: "relative",
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    position: "absolute",
    left: 16,
    top: 0,
    backgroundColor: modernColors.background.paper,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: "500",
    zIndex: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 16,
    color: modernColors.text.primary,
    minHeight: 52,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
    fontSize: 12,
    color: modernColors.error.main,
  },
});

export default AnimatedInput;
