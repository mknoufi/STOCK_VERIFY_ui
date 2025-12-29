/**
 * AppearanceSettings Component
 *
 * Complete appearance customization section for Settings screen
 * Combines Theme, Pattern, Layout, Font Size, and Color pickers
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeContext } from "../../theme/ThemeContext";
import { useSettingsStore } from "../../store/settingsStore";
import { ThemePicker } from "./ThemePicker";
import { PatternPicker } from "./PatternPicker";
import { LayoutPicker } from "./LayoutPicker";
import { GlassCard } from "./GlassCard";
import { FontSizeSlider, ColorPicker, type ColorId } from "../settings";

interface AppearanceSettingsProps {
  showTitle?: boolean;
  scrollable?: boolean;
  compact?: boolean;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  showTitle = true,
  scrollable = true,
  compact = false,
}) => {
  const { theme } = useThemeContext();
  const { settings, setSetting } = useSettingsStore();

  const handleFontSizeChange = (value: number) => {
    setSetting("fontSizeValue", value);
  };

  const handleColorChange = (color: string, colorId: ColorId) => {
    setSetting("primaryColor", color);
    setSetting("primaryColorId", colorId);
  };

  const content = (
    <View style={styles.container}>
      {showTitle && (
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Appearance
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Customize the look and feel of your app
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Theme Selection */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <GlassCard variant="medium" padding={16} style={styles.section}>
          <ThemePicker showModeToggle={true} compact={compact} />
        </GlassCard>
      </Animated.View>

      {/* Pattern Selection */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <GlassCard variant="medium" padding={16} style={styles.section}>
          <PatternPicker compact={compact} />
        </GlassCard>
      </Animated.View>

      {/* Layout Selection */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <GlassCard variant="medium" padding={16} style={styles.section}>
          <LayoutPicker compact={compact} />
        </GlassCard>
      </Animated.View>

      {/* Font Size */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <GlassCard variant="medium" padding={0} style={styles.section}>
          <FontSizeSlider
            value={
              typeof settings.fontSizeValue === "number"
                ? settings.fontSizeValue
                : 16
            }
            onValueChange={handleFontSizeChange}
          />
        </GlassCard>
      </Animated.View>

      {/* Primary Color */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <GlassCard variant="medium" padding={0} style={styles.section}>
          <ColorPicker
            value={settings.primaryColorId || settings.primaryColor}
            onValueChange={handleColorChange}
          />
        </GlassCard>
      </Animated.View>

      {/* Preview Card */}
      <Animated.View entering={FadeInDown.delay(450).springify()}>
        <GlassCard variant="strong" padding={20} style={styles.section}>
          <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
            Preview
          </Text>
          <View
            style={[
              styles.previewBox,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View
              style={[
                styles.previewHeader,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View
                style={[
                  styles.previewDot,
                  { backgroundColor: theme.colors.accent },
                ]}
              />
              <View
                style={[
                  styles.previewLine,
                  { backgroundColor: theme.colors.text, width: "40%" },
                ]}
              />
            </View>
            <View style={styles.previewContent}>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: theme.colors.text, width: "60%" },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    {
                      backgroundColor: theme.colors.textSecondary,
                      width: "80%",
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: theme.colors.text, width: "50%" },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    {
                      backgroundColor: theme.colors.textSecondary,
                      width: "70%",
                    },
                  ]}
                />
              </View>
            </View>
            <View
              style={[
                styles.previewButton,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <View
                style={[
                  styles.previewLine,
                  { backgroundColor: "#FFFFFF", width: "30%" },
                ]}
              />
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    gap: 16,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 0,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  previewBox: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewLine: {
    height: 8,
    borderRadius: 4,
    opacity: 0.8,
  },
  previewContent: {
    gap: 8,
  },
  previewCard: {
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  previewButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
  },
});

export default AppearanceSettings;
