/**
 * Appearance Settings Screen for Staff
 *
 * Allows staff users to customize theme, patterns, and layout arrangements
 */

import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../src/theme/ThemeContext";
import { AppearanceSettings, PatternBackground } from "../../src/components/ui";

export default function StaffAppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, pattern } = useThemeContext();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Pattern Background */}
      <PatternBackground
        pattern={pattern}
        color={theme.colors.accent}
        secondaryColor={theme.colors.textSecondary}
        opacity={0.03}
      />

      {/* Header */}
      <Animated.View
        entering={FadeIn}
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: `${theme.colors.surface}F0`,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <AppearanceSettings showTitle={true} scrollable={true} compact={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
