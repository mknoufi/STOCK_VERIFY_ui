/**
 * ThemePicker Component
 *
 * Visual theme selection grid with live preview
 * Shows all available themes with color swatches
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext, ThemeKey, ThemeMode } from '../../theme/ThemeContext';
import { GlassCard } from './GlassCard';

interface ThemePickerProps {
  showModeToggle?: boolean;
  compact?: boolean;
  columns?: 2 | 3;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({
  showModeToggle = true,
  compact = false,
  columns = 3,
}) => {
  const {
    theme,
    themeKey,
    themeMode,
    setThemeKey,
    setThemeMode,
    availableThemes,
    isDark,
  } = useThemeContext();

  const handleThemeSelect = useCallback((key: ThemeKey) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setThemeKey(key);
  }, [setThemeKey]);

  const handleModeChange = useCallback((mode: ThemeMode) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setThemeMode(mode);
  }, [setThemeMode]);

  const cardSize = compact ? 80 : 100;

  return (
    <View style={styles.container}>
      {/* Theme Mode Toggle */}
      {showModeToggle && (
        <View style={styles.modeSection}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Appearance Mode
          </Text>
          <View style={[styles.modeToggle, { backgroundColor: theme.colors.surface }]}>
            {(['light', 'system', 'dark'] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  themeMode === mode && { backgroundColor: theme.colors.accent },
                ]}
                onPress={() => handleModeChange(mode)}
              >
                <Ionicons
                  name={
                    mode === 'light' ? 'sunny-outline' :
                      mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'
                  }
                  size={18}
                  color={themeMode === mode ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: themeMode === mode ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Theme Grid */}
      <View style={styles.themeSection}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
          Color Theme
        </Text>
        <View style={[styles.themeGrid, { gap: compact ? 8 : 12 }]}>
          {availableThemes.map((t, index) => (
            <Animated.View
              key={t.key}
              entering={FadeInDown.delay(index * 50).springify()}
            >
              <ThemeCard
                themeInfo={t}
                isSelected={themeKey === t.key}
                onSelect={() => handleThemeSelect(t.key)}
                size={cardSize}
                accentColor={theme.colors.accent}
                textColor={theme.colors.text}
              />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Individual Theme Card
interface ThemeCardProps {
  themeInfo: { key: ThemeKey; name: string; preview: string[] };
  isSelected: boolean;
  onSelect: () => void;
  size: number;
  accentColor: string;
  textColor: string;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  themeInfo,
  isSelected,
  onSelect,
  size,
  accentColor,
  textColor,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.themeCard,
            {
              width: size,
              height: size + 24,
              borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {/* Color Preview */}
          <LinearGradient
            colors={themeInfo.preview as [string, string, ...string[]]}
            style={[styles.colorPreview, { height: size - 20 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Color Dots */}
            <View style={styles.colorDots}>
              {themeInfo.preview.map((color, i) => (
                <View
                  key={i}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color, borderColor: 'rgba(255,255,255,0.3)' },
                  ]}
                />
              ))}
            </View>

            {/* Selected Checkmark */}
            {isSelected && (
              <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </LinearGradient>

          {/* Theme Name */}
          <Text
            style={[
              styles.themeName,
              { color: textColor },
              isSelected && { fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {themeInfo.name}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  modeSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  themeSection: {
    gap: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  colorPreview: {
    width: '100%',
    justifyContent: 'flex-end',
    padding: 8,
  },
  colorDots: {
    flexDirection: 'row',
    gap: 4,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
  },
});

export default ThemePicker;
