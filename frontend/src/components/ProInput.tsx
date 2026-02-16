import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { COLORS, METRICS } from "../constants/theme";

// New Industrial Style Props
type ProInputProps = {
  label: string;
  unit?: string;
  error?: boolean | string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
} & Omit<TextInputProps, "style">;

export function ProInput({
  label,
  unit,
  error,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: ProInputProps) {
  const [focused, setFocused] = useState(false);

  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <View
      style={[
        styles.container,
        focused && styles.focused,
        hasError && styles.error,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          {...rest}
          style={[styles.input, inputStyle]}
          placeholderTextColor={COLORS.TEXT_MUTED}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // New Industrial Style
  container: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: METRICS.radius,
    borderWidth: 1,
    borderColor: COLORS.INPUT_BORDER,
    padding: 12,
    marginBottom: 16,
  },
  focused: {
    borderColor: COLORS.INFO,
    backgroundColor: "#162032",
  },
  error: {
    borderColor: COLORS.ERROR,
  },
  label: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
  },
  unit: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorText: {
    marginTop: METRICS.SPACING_1,
    color: COLORS.ERROR,
    fontSize: 12,
    fontWeight: "600",
  },
});
