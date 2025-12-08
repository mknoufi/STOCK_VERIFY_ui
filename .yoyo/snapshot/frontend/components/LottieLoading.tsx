/**
 * Lottie Loading Component
 * Pre-configured loading animation with Lottie
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { LottieAnimation } from './LottieAnimation';
import { ActivityIndicator } from 'react-native';

interface LottieLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
}

// You can download free Lottie animations from https://lottiefiles.com
// For now, we'll use a fallback ActivityIndicator
export const LottieLoading: React.FC<LottieLoadingProps> = ({
  message = 'Loading...',
  size = 'large',
  overlay = false,
}) => {
  const theme = useTheme();

  // Size mappings
  const sizeMap = {
    small: 60,
    medium: 100,
    large: 150,
  };

  const animationSize = sizeMap[size];

  return (
    <View style={[styles.container, overlay && styles.overlay]}>
      {/*
        To use actual Lottie animations:
        1. Download a Lottie JSON file from https://lottiefiles.com
        2. Place it in frontend/assets/animations/
        3. Use: source={require('../assets/animations/loading.json')}
      */}
      <LottieAnimation
        source={undefined} // Replace with require() path to Lottie JSON
        width={animationSize}
        height={animationSize}
        fallback={
          <View style={styles.fallback}>
            <ActivityIndicator size={size === 'medium' ? 'large' : size} color={theme.colors.primary} />
          </View>
        }
      />
      {message && (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
