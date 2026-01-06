import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../../theme/ThemeContext';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export const ThemeToggle: React.FC = () => {
  const { theme, themeMode, setThemeMode } = useThemeContext();
  const { colors } = theme;
  const { triggerHaptic } = useHapticFeedback();

  // Animation values
  const scaleAnim = new Animated.Value(1);
  const rotateAnim = new Animated.Value(0);

  const handleToggle = () => {
    // Haptic feedback for better UX
    triggerHaptic('impactLight');

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotate icon
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });

    // Update theme
    if (themeMode === 'light') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('system');
    else setThemeMode('light');
  };

  const getIconName = () => {
    if (themeMode === 'light') return 'sunny';
    if (themeMode === 'dark') return 'moon';
    return 'settings';
  };

  const getLabel = () => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  };

  const getAccessibilityLabel = () => {
    return `Switch to ${getLabel().toLowerCase()} theme`;
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handleToggle}
      activeOpacity={0.7}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="button"
      accessibilityHint={`Current theme: ${themeMode}. Tap to switch to ${getLabel().toLowerCase()}`}
    >
      <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
        <Ionicons name={getIconName()} size={20} color={colors.accent} />
      </Animated.View>
      <Text style={[styles.label, { color: colors.text }]}>{getLabel()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
