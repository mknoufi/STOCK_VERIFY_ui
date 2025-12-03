/**
 * Lottie Animation Component
 * Wrapper for Lottie animations with fallback support
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { flags } from '../constants/flags';

interface LottieAnimationProps {
  source?: any; // Lottie JSON source or require() path
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: any;
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  source,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  width = 200,
  height = 200,
  fallback,
}) => {
  const theme = useTheme();
  const [LottieView, setLottieView] = React.useState<any>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (flags.enableAnimations) {
      import('lottie-react-native')
        .then((mod) => {
          setLottieView(() => mod.default);
        })
        .catch(() => {
          setError(true);
        });
    } else {
      setError(true);
    }
  }, []);

  if (error || !LottieView || !source) {
    return (
      fallback || (
        <View style={[styles.container, { width, height }, style]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )
    );
  }

  return (
    <LottieView
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={[styles.animation, { width, height }, style]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    alignSelf: 'center',
  },
});
