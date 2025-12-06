/**
 * Floating Label Input - Enhanced input with floating label animation
 */

import React, { useState, useRef } from "react";
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import styled from "@emotion/native";
import {
  modernColors,
  modernTypography,
  modernBorderRadius,
  modernSpacing,
  modernShadows,
} from "../../styles/modernDesignSystem";
import { timingPresets, springPresets } from "../../utils/animationHelpers";

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  containerStyle?: any;
}

export const FloatingLabelInput = React.forwardRef<TextInput, FloatingLabelInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconPress,
      required = false,
      value,
      onFocus,
      onBlur,
      containerStyle,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const labelPosition = useSharedValue(value ? 1 : 0);
    const borderWidth = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      labelPosition.value = withSpring(1, springPresets.gentle);
      borderWidth.value = withTiming(2, timingPresets.fast);
      glowOpacity.value = withTiming(1, timingPresets.normal);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (!value) {
        labelPosition.value = withSpring(0, springPresets.gentle);
      }
      borderWidth.value = withTiming(1, timingPresets.fast);
      glowOpacity.value = withTiming(0, timingPresets.normal);
      onBlur?.(e);
    };

    // Update label position when value changes externally
    React.useEffect(() => {
      if (value && labelPosition.value === 0) {
        labelPosition.value = withSpring(1, springPresets.gentle);
      } else if (!value && !isFocused && labelPosition.value === 1) {
        labelPosition.value = withSpring(0, springPresets.gentle);
      }
    }, [value]);

    const labelStyle = useAnimatedStyle(() => {
      const translateY = interpolate(
        labelPosition.value,
        [0, 1],
        [0, -28],
        Extrapolate.CLAMP
      );
      const scale = interpolate(labelPosition.value, [0, 1], [1, 0.85], Extrapolate.CLAMP);
      const color = error
        ? modernColors.error.main
        : isFocused
        ? modernColors.primary[500]
        : modernColors.text.tertiary;

      return {
        transform: [{ translateY }, { scale }],
        color,
      };
    });

    const containerAnimatedStyle = useAnimatedStyle(() => {
      const borderColor = error
        ? modernColors.error.main
        : isFocused
        ? modernColors.primary[500]
        : modernColors.border.light;

      return {
        borderWidth: borderWidth.value,
        borderColor,
      };
    });

    const glowStyle = useAnimatedStyle(() => ({
      opacity: glowOpacity.value,
    }));

    return (
      <Container style={containerStyle}>
        <InputWrapper>
          {/* Glow effect */}
          {!error && (
            <GlowContainer style={glowStyle}>
              <GlowEffect />
            </GlowContainer>
          )}

          {/* Input container */}
          <AnimatedInputContainer style={containerAnimatedStyle}>
            {leftIcon && (
              <IconWrapper>
                <Ionicons
                  name={leftIcon}
                  size={20}
                  color={
                    error
                      ? modernColors.error.main
                      : isFocused
                      ? modernColors.primary[500]
                      : modernColors.text.tertiary
                  }
                />
              </IconWrapper>
            )}

            <InputContent>
              <AnimatedLabel style={labelStyle}>
                {label}
                {required && <RequiredMark> *</RequiredMark>}
              </AnimatedLabel>

              <StyledTextInput
                ref={ref}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholderTextColor={modernColors.text.disabled}
                {...props}
              />
            </InputContent>

            {rightIcon && (
              <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
                <IconWrapper>
                  <Ionicons
                    name={rightIcon}
                    size={20}
                    color={
                      error
                        ? modernColors.error.main
                        : isFocused
                        ? modernColors.primary[500]
                        : modernColors.text.tertiary
                    }
                  />
                </IconWrapper>
              </TouchableOpacity>
            )}
          </AnimatedInputContainer>
        </InputWrapper>

        {/* Error or helper text */}
        {(error || helperText) && (
          <HelperTextContainer>
            {error && (
              <Ionicons name="alert-circle" size={14} color={modernColors.error.main} />
            )}
            <HelperText error={!!error}>{error || helperText}</HelperText>
          </HelperTextContainer>
        )}
      </Container>
    );
  }
);

FloatingLabelInput.displayName = "FloatingLabelInput";

// Styled Components
const Container = styled.View`
  margin-bottom: ${modernSpacing.lg}px;
`;

const InputWrapper = styled.View`
  position: relative;
`;

const GlowContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
`;

const GlowEffect = styled.View`
  flex: 1;
  border-radius: ${modernBorderRadius.input}px;
  background-color: ${modernColors.primary[500]};
  opacity: 0.2;
  shadow-color: ${modernColors.primary[500]};
  shadow-offset: 0px 0px;
  shadow-opacity: 0.5;
  shadow-radius: 12px;
  elevation: 6;
`;

const AnimatedInputContainer = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.input}px;
  min-height: 56px;
  padding: 0 ${modernSpacing.md}px;
`;

const IconWrapper = styled.View`
  margin-right: ${modernSpacing.sm}px;
`;

const InputContent = styled.View`
  flex: 1;
  justify-content: center;
  padding-top: ${modernSpacing.sm}px;
`;

const AnimatedLabel = styled(Animated.Text)`
  position: absolute;
  left: 0;
  font-size: ${modernTypography.body.medium.fontSize}px;
  font-weight: 500;
  transform-origin: left center;
`;

const RequiredMark = styled.Text`
  color: ${modernColors.error.main};
`;

const StyledTextInput = styled.TextInput`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.primary};
  padding: 0;
  margin: 0;
  min-height: 24px;
`;

const HelperTextContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: ${modernSpacing.xs}px;
  padding-horizontal: ${modernSpacing.xs}px;
  gap: ${modernSpacing.xs}px;
`;

const HelperText = styled.Text<{ error: boolean }>`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${(props) =>
    props.error ? modernColors.error.main : modernColors.text.tertiary};
`;