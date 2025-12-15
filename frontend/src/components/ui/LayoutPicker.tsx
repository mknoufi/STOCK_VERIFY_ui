/**
 * LayoutPicker Component
 *
 * Select different layout arrangements for the app
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeContext, LayoutArrangement } from '../../theme/ThemeContext';

interface LayoutPickerProps {
  compact?: boolean;
}

export const LayoutPicker: React.FC<LayoutPickerProps> = ({ compact = false }) => {
  const { theme, layout, setLayout, availableLayouts } = useThemeContext();

  const handleLayoutSelect = useCallback((key: LayoutArrangement) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLayout(key);
  }, [setLayout]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
        Layout Style
      </Text>
      <View style={styles.layoutGrid}>
        {availableLayouts.map((l, index) => (
          <Animated.View
            key={l.key}
            entering={FadeInDown.delay(index * 30).springify()}
          >
            <LayoutItem
              layout={l}
              isSelected={layout === l.key}
              onSelect={() => handleLayoutSelect(l.key)}
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

interface LayoutItemProps {
  layout: { key: LayoutArrangement; name: string; icon: string };
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
  textColor: string;
  surfaceColor: string;
  compact: boolean;
}

const LayoutItem: React.FC<LayoutItemProps> = ({
  layout,
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
      onPressIn={() => { scale.value = withSpring(0.92); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View
        style={[
          animatedStyle,
          styles.layoutItem,
          {
            backgroundColor: isSelected ? accentColor : surfaceColor,
            borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
            minWidth: compact ? 90 : 100,
          },
        ]}
      >
        <Ionicons
          name={layout.icon as any}
          size={compact ? 22 : 26}
          color={isSelected ? '#FFFFFF' : textColor}
        />
        <Text
          style={[
            styles.layoutName,
            { color: isSelected ? '#FFFFFF' : textColor },
          ]}
          numberOfLines={1}
        >
          {layout.name}
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  layoutItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  layoutName: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LayoutPicker;
