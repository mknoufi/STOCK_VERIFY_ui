import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  visible,
  onHide,
  duration = 3000,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-100);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });

      // Auto-hide after duration
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        });
        translateY.value = withTiming(-100, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        });
        scale.value = withTiming(
          0.8,
          {
            duration: 300,
            easing: Easing.in(Easing.ease),
          },
          () => {
            runOnJS(onHide)();
          },
        );
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset when hidden
      opacity.value = 0;
      translateY.value = -100;
      scale.value = 0.8;
      return undefined;
    }
  }, [visible, duration, onHide, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
    };
  });

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      default:
        return "information-circle";
    }
  };

  const getColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50";
      case "error":
        return "#F44336";
      case "warning":
        return "#FF9800";
      default:
        return "#2196F3";
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getColor() + "15",
          borderLeftColor: getColor(),
        },
        animatedStyle,
      ]}
    >
      <Ionicons name={getIcon()} size={20} color={getColor()} />
      <Text style={[styles.message, { color: getColor() }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  message: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
