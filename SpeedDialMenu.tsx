import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface SpeedDialMenuProps {
  actions: Action[];
}

export const SpeedDialMenu: React.FC<SpeedDialMenuProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useSharedValue(0);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    animation.value = withSpring(toValue);
    setIsOpen(!isOpen);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 1 : 0),
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  const buttonRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(animation.value, [0, 1], [0, 45])}deg` }],
  }));

  return (
    <>
      {isOpen && (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu}>
            <BlurView intensity={10} style={StyleSheet.absoluteFill} />
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.container}>
        {actions.map((action, index) => {
          const actionStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
              animation.value,
              [0, 1],
              [0, -60 * (index + 1)],
              Extrapolate.CLAMP
            );
            const opacity = interpolate(animation.value, [0, 0.5, 1], [0, 0, 1]);
            const scale = interpolate(animation.value, [0, 1], [0.8, 1]);

            return {
              transform: [{ translateY }, { scale }],
              opacity,
              position: 'absolute',
              bottom: 0,
              right: 0,
            };
          });

          return (
            <Animated.View key={index} style={[styles.actionContainer, actionStyle]}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{action.label}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  action.onPress();
                  toggleMenu();
                }}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <TouchableOpacity
          style={styles.fab}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={buttonRotation}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  labelContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
