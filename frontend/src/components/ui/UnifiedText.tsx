/**
 * UnifiedText Component
 * Text component that uses unified typography tokens
 *
 * Features:
 * - Consistent typography from unified system
 * - Supports all text style variants
 * - Accessibility props
 * - Dark mode aware
 */

import React from "react";
import {
  Text,
  TextStyle,
  StyleProp,
  StyleSheet,
  TextProps,
} from "react-native";
import {
  textStyles,
  fontFamily,
  fontSize,
  fontWeight as fw,
  lineHeight,
  colors,
  semanticColors,
} from "../../theme/unified";

// ==========================================
// TYPES
// ==========================================
export type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption"
  | "overline"
  | "button"
  | "mono";

export type TextColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "muted"
  | "disabled"
  | "inverse"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "link";

export interface UnifiedTextProps extends TextProps {
  /** Typography variant */
  variant?: TextVariant;
  /** Text color from semantic colors */
  color?: TextColor;
  /** Override font weight */
  weight?: "regular" | "medium" | "semiBold" | "bold";
  /** Center text */
  center?: boolean;
  /** Right align text */
  right?: boolean;
  /** Additional styles */
  style?: StyleProp<TextStyle>;
  /** Children text content */
  children: React.ReactNode;
}

// ==========================================
// COLOR MAPPING
// ==========================================
const colorMap: Record<TextColor, string> = {
  primary: semanticColors.text.primary,
  secondary: semanticColors.text.secondary,
  tertiary: semanticColors.text.tertiary,
  muted: semanticColors.text.muted,
  disabled: semanticColors.text.disabled,
  inverse: colors.white,
  success: colors.success[500],
  warning: colors.warning[600],
  error: colors.error[500],
  info: colors.info[500],
  link: colors.primary[500],
};

// ==========================================
// VARIANT MAPPING
// ==========================================
const variantMap: Record<TextVariant, TextStyle> = {
  h1: textStyles.h1,
  h2: textStyles.h2,
  h3: textStyles.h3,
  h4: textStyles.h4,
  h5: textStyles.h5,
  h6: textStyles.h6,
  subtitle1: textStyles.subtitle1,
  subtitle2: textStyles.subtitle2,
  body1: textStyles.body1,
  body2: textStyles.body2,
  caption: textStyles.caption,
  overline: textStyles.overline,
  button: textStyles.button,
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
  },
};

// ==========================================
// COMPONENT
// ==========================================
export const UnifiedText: React.FC<UnifiedTextProps> = ({
  variant = "body1",
  color = "primary",
  weight,
  center,
  right,
  style,
  children,
  accessibilityRole = "text",
  ...props
}) => {
  const variantStyle = variantMap[variant];
  const textColor = colorMap[color];

  const combinedStyle: StyleProp<TextStyle> = [
    styles.base,
    variantStyle,
    { color: textColor },
    weight && { fontWeight: fw[weight] as TextStyle["fontWeight"] },
    center && styles.center,
    right && styles.right,
    style,
  ];

  return (
    <Text
      style={combinedStyle}
      accessibilityRole={accessibilityRole}
      {...props}
    >
      {children}
    </Text>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  base: {
    color: semanticColors.text.primary,
  },
  center: {
    textAlign: "center",
  },
  right: {
    textAlign: "right",
  },
});

export default UnifiedText;
