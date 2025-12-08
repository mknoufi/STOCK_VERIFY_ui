import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}

export const GlassCard = ({ children, style, intensity = 20, tint = "dark" }: GlassCardProps) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint={tint} style={styles.blur}>
        <View style={styles.content}>{children}</View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "rgba(30, 41, 59, 0.4)", // Slate-800 with opacity
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  blur: {
    width: "100%",
    height: "100%",
  },
  content: {
    padding: 16,
  },
});
