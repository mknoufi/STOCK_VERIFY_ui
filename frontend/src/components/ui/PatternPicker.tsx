/**
 * PatternPicker Component
 *
 * Visual pattern selection for background arrangements
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useThemeContext, PatternType } from "../../context/ThemeContext";

interface PatternPickerProps {
  compact?: boolean;
}

export const PatternPicker: React.FC<PatternPickerProps> = ({
  compact = false,
}) => {
  const { themeLegacy: theme, pattern, setPattern, availablePatterns } = useThemeContext();

  const handlePatternSelect = useCallback(
    (key: PatternType) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setPattern(key);
    },
    [setPattern],
  );

  return (
    <View style={styles.container}>
      <Text
        style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
      >
        Background Pattern
      </Text>
      <View style={styles.patternGrid}>
        {availablePatterns.map((p, index) => (
          <Animated.View
            key={p.key}
            entering={FadeInDown.delay(index * 30).springify()}
          >
            <PatternItem
              pattern={p}
              isSelected={pattern === p.key}
              onSelect={() => handlePatternSelect(p.key)}
              accentColor={theme.colors.accent}
              textColor={theme.colors.text}
              surfaceColor={theme.colors.surface}
              compact={compact}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

interface PatternItemProps {
  pattern: { key: PatternType; name: string; icon: string };
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
  textColor: string;
  surfaceColor: string;
  compact: boolean;
}

const PatternItem: React.FC<PatternItemProps> = ({
  pattern,
  isSelected,
  onSelect,
  accentColor,
  textColor,
  surfaceColor,
  compact,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onSelect}
      onPressIn={() => {
        scale.value = withSpring(0.92);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          styles.patternItem,
          {
            backgroundColor: isSelected ? accentColor : surfaceColor,
            borderColor: isSelected ? accentColor : "rgba(255,255,255,0.1)",
            minWidth: compact ? 70 : 80,
          },
        ]}
      >
        <Ionicons
          name={pattern.icon as any}
          size={compact ? 20 : 24}
          color={isSelected ? "#FFFFFF" : textColor}
        />
        <Text
          style={[
            styles.patternName,
            { color: isSelected ? "#FFFFFF" : textColor },
          ]}
          numberOfLines={1}
        >
          {pattern.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  patternGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  patternItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  patternName: {
    fontSize: 11,
    fontWeight: "500",
  },
});

export default PatternPicker;
