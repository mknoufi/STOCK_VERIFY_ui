/**
 * EnhancedBottomSheet Component - Aurora Design v2.0
 *
 * Improved bottom sheet with gestures and snap points
 * Features:
 * - Gesture-driven interactions
 * - Multiple snap points
 * - Spring physics
 * - Backdrop blur
 * - Handle indicator
 */

import React, { useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

type SnapPoint = number | `${number}%`;

interface EnhancedBottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: SnapPoint[];
  initialSnapIndex?: number;
  title?: string;
  showHandle?: boolean;
  enableBackdrop?: boolean;
  backdropOpacity?: number;
}

export const EnhancedBottomSheet: React.FC<EnhancedBottomSheetProps> = ({
  children,
  isOpen,
  onClose,
  snapPoints = ["50%", "90%"],
  initialSnapIndex = 0,
  title,
  showHandle = true,
  enableBackdrop = true,
  backdropOpacity = 0.5,
}) => {
  const { height: screenHeight } = useWindowDimensions();

  const parseSnapPoint = useCallback(
    (point: SnapPoint): number => {
      if (typeof point === "number") {
        return point;
      }
      const percentage = parseFloat(point) / 100;
      return screenHeight * percentage;
    },
    [screenHeight],
  );

  const parsedSnapPoints = useMemo(
    () => snapPoints.map(parseSnapPoint).sort((a, b) => a - b),
    [snapPoints, parseSnapPoint],
  );

  const translateY = useSharedValue(screenHeight);
  const contextY = useSharedValue(0);
  const activeIndex = useSharedValue(initialSnapIndex);

  const maxTranslateY =
    screenHeight - (parsedSnapPoints[parsedSnapPoints.length - 1] ?? 0);
  const minTranslateY = screenHeight - (parsedSnapPoints[0] ?? 0);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const targetY = screenHeight - (parsedSnapPoints[initialSnapIndex] ?? 0);
      translateY.value = withSpring(targetY, {
        damping: 20,
        stiffness: 150,
        mass: 0.5,
      });
      activeIndex.value = initialSnapIndex;
    } else {
      translateY.value = withTiming(screenHeight, { duration: 300 });
    }
  }, [
    isOpen,
    initialSnapIndex,
    parsedSnapPoints,
    translateY,
    activeIndex,
    screenHeight,
  ]);

  const findNearestSnapPoint = (currentY: number): number => {
    let nearestIndex = 0;
    let minDistance = Math.abs(
      screenHeight - (parsedSnapPoints[0] ?? 0) - currentY,
    );

    parsedSnapPoints.forEach((point, index) => {
      const targetY = screenHeight - point;
      const distance = Math.abs(targetY - currentY);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newY = contextY.value + event.translationY;
      translateY.value = Math.max(maxTranslateY, Math.min(screenHeight, newY));
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const velocity = event.velocityY;

      // Dismiss if swiped down fast or below minimum point
      if (velocity > 500 || currentY > minTranslateY + 50) {
        translateY.value = withSpring(screenHeight, {
          velocity,
          damping: 20,
          stiffness: 150,
        });
        runOnJS(onClose)();
        return;
      }

      // Find nearest snap point
      const nearestIndex = findNearestSnapPoint(currentY);
      const targetY = screenHeight - (parsedSnapPoints[nearestIndex] ?? 0);

      translateY.value = withSpring(targetY, {
        velocity,
        damping: 20,
        stiffness: 150,
      });

      if (nearestIndex !== activeIndex.value) {
        activeIndex.value = nearestIndex;
        runOnJS(triggerHaptic)();
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [screenHeight, minTranslateY],
      [0, backdropOpacity],
      Extrapolation.CLAMP,
    ),
  }));

  const handleIndicatorStyle = useAnimatedStyle(() => ({
    width: interpolate(
      translateY.value,
      [maxTranslateY, minTranslateY],
      [60, 40],
      Extrapolation.CLAMP,
    ),
  }));

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      {enableBackdrop && (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
      )}

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.sheet, { height: screenHeight }, sheetStyle]}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            {/* Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <Animated.View style={[styles.handle, handleIndicatorStyle]} />
              </View>
            )}

            {/* Title */}
            {title && (
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>{children}</View>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: auroraTheme.colors.background.glass,
    borderTopLeftRadius: auroraTheme.borderRadius["2xl"],
    borderTopRightRadius: auroraTheme.borderRadius["2xl"],
    overflow: "hidden",
    ...auroraTheme.shadows.xl,
  },
  blurContainer: {
    flex: 1,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: auroraTheme.spacing.md,
    paddingBottom: auroraTheme.spacing.sm,
  },
  handle: {
    height: 5,
    backgroundColor: auroraTheme.colors.neutral[500],
    borderRadius: 2.5,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.neutral[700],
  },
  title: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: auroraTheme.colors.neutral[700],
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: auroraTheme.colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: auroraTheme.spacing.lg,
  },
});

export default EnhancedBottomSheet;
