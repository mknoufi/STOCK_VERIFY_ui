/**
 * SwipeCard Component - Aurora Design v2.0
 *
 * Swipeable card with actions
 * Features:
 * - Swipe gestures for quick actions
 * - Haptic feedback
 * - Smooth spring animations
 * - Customizable action buttons
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";
import { GlassCard } from "./GlassCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 80;

interface SwipeAction {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  onPress: () => void;
  label?: string;
}

interface SwipeCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  style?: ViewStyle;
  onSwipeComplete?: (direction: "left" | "right") => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  style,
  onSwipeComplete,
}) => {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = contextX.value + event.translationX;

      // Limit swipe distance
      const maxSwipe =
        rightActions.length > 0 ? SWIPE_THRESHOLD * rightActions.length : 0;
      const minSwipe =
        leftActions.length > 0 ? -SWIPE_THRESHOLD * leftActions.length : 0;

      translateX.value = Math.max(minSwipe, Math.min(maxSwipe, newValue));
    })
    .onEnd((event) => {
      // Determine if we should snap to action position
      if (translateX.value > SWIPE_THRESHOLD / 2 && leftActions.length > 0) {
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(triggerHaptic)();
      } else if (
        translateX.value < -SWIPE_THRESHOLD / 2 &&
        rightActions.length > 0
      ) {
        translateX.value = withSpring(-SWIPE_THRESHOLD);
        runOnJS(triggerHaptic)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [0, SWIPE_THRESHOLD],
          [0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const rightActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-SWIPE_THRESHOLD, 0],
          [1, 0.8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const handleActionPress = (action: SwipeAction) => {
    translateX.value = withSpring(0);
    action.onPress();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.leftActions,
            leftActionsStyle,
          ]}
        >
          {leftActions.map((action, index) => (
            <Animated.View
              key={index}
              style={[
                styles.actionButton,
                { backgroundColor: action.backgroundColor },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={24}
                color={action.color}
                onPress={() => handleActionPress(action)}
              />
              {action.label && (
                <Text style={[styles.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              )}
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.rightActions,
            rightActionsStyle,
          ]}
        >
          {rightActions.map((action, index) => (
            <Animated.View
              key={index}
              style={[
                styles.actionButton,
                { backgroundColor: action.backgroundColor },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={24}
                color={action.color}
                onPress={() => handleActionPress(action)}
              />
              {action.label && (
                <Text style={[styles.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              )}
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Main Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          <GlassCard variant="medium" elevation="md">
            {children}
          </GlassCard>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  actionsContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  leftActions: {
    left: 0,
    paddingLeft: auroraTheme.spacing.md,
  },
  rightActions: {
    right: 0,
    paddingRight: auroraTheme.spacing.md,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: auroraTheme.borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.md,
  },
  actionLabel: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontFamily: auroraTheme.typography.fontFamily.label,
    marginTop: auroraTheme.spacing.xs,
  },
});

export default SwipeCard;
