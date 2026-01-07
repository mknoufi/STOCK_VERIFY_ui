import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../theme/ThemeContext";
import { useHapticFeedback } from "../../hooks/useHapticFeedback";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  showRetry?: boolean;
  style?: any;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong. Please try again.",
  onRetry,
  retryText = "Try Again",
  showRetry = true,
  style,
}) => {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { triggerHaptic } = useHapticFeedback();

  // Animation for the error icon
  const shakeAnim = new Animated.Value(0);

  const triggerShake = () => {
    triggerHaptic("impactLight");
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRetry = () => {
    if (onRetry) {
      triggerShake();
      onRetry();
    }
  };

  const shakeInterpolate = shakeAnim.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ rotate: shakeInterpolate }] }}>
        <Ionicons
          name="alert-circle"
          size={48}
          color={colors.accent}
          style={styles.icon}
        />
      </Animated.View>
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {showRetry && onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={handleRetry}
          activeOpacity={0.8}
          accessibilityLabel="Retry"
          accessibilityRole="button"
          accessibilityHint="Tap to retry the operation"
        >
          <Text style={[styles.retryText, { color: colors.background }]}>
            {retryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
