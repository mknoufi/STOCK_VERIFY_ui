import React from 'react';
import { View, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useThemeContext } from '../../theme/ThemeContext';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'large',
  style,
}) => {
  const { theme } = useThemeContext();
  const { colors } = theme;

  // Animation for the loading text - use useRef to persist across renders
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size={size}
        color={colors.accent}
        style={styles.loader}
      />
      <Animated.Text
        style={[
          styles.message,
          { color: colors.textSecondary },
          { opacity: fadeAnim }
        ]}
      >
        {message}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
