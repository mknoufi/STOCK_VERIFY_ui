/**
 * Screen Component - Wrapper for all screens
 * Handles safe area insets, consistent padding, and scroll behavior
 */

import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { layout } from "../../styles/globalStyles";

export type ScreenVariant = "default" | "scrollable" | "fullscreen";

interface ScreenProps {
  children: React.ReactNode;
  variant?: ScreenVariant;
  padding?: number;
  backgroundColor?: string;
  scrollEnabled?: boolean;
  keyboardAvoiding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  testID?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  variant = "default",
  padding = layout.screenPadding,
  backgroundColor,
  scrollEnabled = variant === "scrollable",
  keyboardAvoiding = Platform.OS !== "web",
  style,
  contentContainerStyle,
  testID,
}) => {
  const theme = useTheme();
  const bgColor = backgroundColor || theme.colors.background;

  // Fullscreen variant (for scanner, modals)
  if (variant === "fullscreen") {
    return (
      <View
        style={[styles.fullscreen, { backgroundColor: bgColor }, style]}
        testID={testID}
      >
        {children}
      </View>
    );
  }

  // Scrollable variant
  if (scrollEnabled) {
    const content = (
      <ScrollView
        style={[styles.container, { backgroundColor: bgColor }, style]}
        contentContainerStyle={[
          styles.scrollContent,
          { padding },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID={testID}
      >
        {children}
      </ScrollView>
    );

    if (keyboardAvoiding && Platform.OS !== "web") {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }

    return content;
  }

  // Default variant (flex container)
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }, style]}
      testID={testID}
    >
      <View style={[styles.content, { padding }]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreen: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
});
