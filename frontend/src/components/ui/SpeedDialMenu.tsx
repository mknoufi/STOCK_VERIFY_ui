/**
 * SpeedDialMenu Component - Aurora Design
 *
 * Floating action button with expandable menu
 * Features:
 * - Smooth expand/collapse animation
 * - Backdrop blur overlay
 * - Haptic feedback
 * - Gradient buttons
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

export interface SpeedDialAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: number;
}

interface SpeedDialMenuProps {
  actions: SpeedDialAction[];
  mainIcon?: keyof typeof Ionicons.glyphMap;
  mainColor?: readonly [string, string, ...string[]];
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Extracted action item component to comply with React hooks rules
interface SpeedDialActionItemProps {
  action: SpeedDialAction;
  index: number;
  animationProgress: SharedValue<number>;
  onPress: (action: SpeedDialAction) => void;
}

const SpeedDialActionItem: React.FC<SpeedDialActionItemProps> = ({
  action,
  index,
  animationProgress,
  onPress,
}) => {
  const actionStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [0, -(72 + auroraTheme.spacing.md) * (index + 1)],
    );
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
    );
    const scale = interpolate(animationProgress.value, [0, 1], [0.3, 1]);

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <AnimatedTouchable
      style={[styles.actionButton, actionStyle]}
      onPress={() => onPress(action)}
      activeOpacity={0.9}
    >
      <View style={styles.actionContent}>
        {/* Label */}
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                fontFamily: auroraTheme.typography.fontFamily.label,
                fontSize: auroraTheme.typography.fontSize.sm,
              },
            ]}
          >
            {action.label}
          </Text>
        </View>

        {/* Icon Button */}
        <View style={styles.iconButton}>
          <LinearGradient
            colors={
              action.color
                ? [action.color, action.color]
                : [
                    auroraTheme.colors.aurora.secondary[0],
                    auroraTheme.colors.aurora.secondary[1],
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons
              name={action.icon}
              size={24}
              color={auroraTheme.colors.text.primary}
            />
            {action.badge !== undefined && action.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge}</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </AnimatedTouchable>
  );
};

export const SpeedDialMenu: React.FC<SpeedDialMenuProps> = ({
  actions,
  mainIcon = "menu",
  mainColor = auroraTheme.colors.aurora.primary,
  position = "bottom-right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animationProgress = useSharedValue(0);
  const mainRotation = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      animationProgress.value = withSpring(1, { damping: 15, stiffness: 150 });
      mainRotation.value = withSpring(135, { damping: 12 });
    } else {
      animationProgress.value = withTiming(0, { duration: 200 });
      mainRotation.value = withSpring(0, { damping: 12 });
    }
  }, [isOpen, animationProgress, mainRotation]);

  const toggleMenu = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsOpen(!isOpen);
  };

  const handleActionPress = (action: SpeedDialAction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action.onPress();
    setIsOpen(false);
  };

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${mainRotation.value}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
    pointerEvents: isOpen ? "auto" : "none",
  }));

  const getPositionStyles = () => {
    const base = { position: "absolute" as const };
    switch (position) {
      case "bottom-right":
        return {
          ...base,
          bottom: auroraTheme.spacing.lg,
          right: auroraTheme.spacing.lg,
        };
      case "bottom-left":
        return {
          ...base,
          bottom: auroraTheme.spacing.lg,
          left: auroraTheme.spacing.lg,
        };
      case "top-right":
        return {
          ...base,
          top: auroraTheme.spacing.lg,
          right: auroraTheme.spacing.lg,
        };
      case "top-left":
        return {
          ...base,
          top: auroraTheme.spacing.lg,
          left: auroraTheme.spacing.lg,
        };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatedBlurView
        intensity={20}
        tint="dark"
        style={[StyleSheet.absoluteFill, backdropStyle]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={toggleMenu}
          activeOpacity={1}
        />
      </AnimatedBlurView>

      {/* Speed Dial Container */}
      <View style={[styles.container, getPositionStyles()]}>
        {/* Action Buttons */}
        {actions.map((action, index) => (
          <SpeedDialActionItem
            key={index}
            action={action}
            index={index}
            animationProgress={animationProgress}
            onPress={handleActionPress}
          />
        ))}

        {/* Main Button */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={toggleMenu}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={mainColor}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainGradient}
          >
            <Animated.View style={mainButtonStyle}>
              <Ionicons
                name={mainIcon}
                size={32}
                color={auroraTheme.colors.text.primary}
              />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    zIndex: 1000,
  },
  mainButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...auroraTheme.shadows.xl,
  },
  mainGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  actionButton: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  labelContainer: {
    backgroundColor: auroraTheme.colors.background.glass,
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
    borderRadius: auroraTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
    ...auroraTheme.shadows.md,
  },
  label: {
    color: auroraTheme.colors.text.primary,
    fontWeight: "600",
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    ...auroraTheme.shadows.lg,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: auroraTheme.colors.error[500],
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: auroraTheme.colors.background.primary,
  },
  badgeText: {
    color: auroraTheme.colors.text.primary,
    fontSize: 10,
    fontWeight: "700",
  },
});
