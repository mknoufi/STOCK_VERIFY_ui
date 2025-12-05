import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernSpacing,
  modernTypography,
} from "../src/styles/modernDesignSystem";

export default function Help() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="help-buoy-outline"
          size={64}
          color={modernColors.primary[500]}
        />
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.message}>
          For assistance, please contact the IT support team or refer to the
          user manual.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
    padding: modernSpacing.screenPadding,
  },
  content: {
    alignItems: "center",
    gap: modernSpacing.md,
  },
  title: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  message: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    maxWidth: 300,
  },
});
