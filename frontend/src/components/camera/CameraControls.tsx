/**
 * CameraControls Component
 * Enhanced camera controls for scanning
 * Phase 0: Enhanced Mobile Camera Features
 */

import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  borderRadius,
  shadows,
} from "@/theme/designTokens";

interface CameraControlsProps {
  torchEnabled: boolean;
  zoom: number;
  onToggleTorch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  style?: any;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  torchEnabled,
  zoom,
  onToggleTorch,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  style,
}) => {
  const torchScale = useSharedValue(1);

  const torchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: torchScale.value }],
  }));

  const handleTorchPress = () => {
    torchScale.value = withSpring(0.9, {}, () => {
      torchScale.value = withSpring(1);
    });
    onToggleTorch();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Torch/Flash Control */}
      <Animated.View style={torchAnimatedStyle}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            torchEnabled && styles.controlButtonActive,
            shadows[3],
          ]}
          onPress={handleTorchPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={torchEnabled ? "flash" : "flash-off"}
            size={24}
            color={
              torchEnabled ? colorPalette.warning[500] : colorPalette.neutral[0]
            }
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Zoom Controls */}
      <View style={styles.zoomContainer}>
        <TouchableOpacity
          style={[styles.zoomButton, shadows[2]]}
          onPress={onZoomOut}
          disabled={zoom <= 0}
          activeOpacity={0.7}
        >
          <Ionicons
            name="remove"
            size={20}
            color={
              zoom <= 0 ? colorPalette.neutral[400] : colorPalette.neutral[0]
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomIndicator, shadows[2]]}
          onPress={onResetZoom}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomText}>{(zoom * 100).toFixed(0)}%</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomButton, shadows[2]]}
          onPress={onZoomIn}
          disabled={zoom >= 1}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={20}
            color={
              zoom >= 1 ? colorPalette.neutral[400] : colorPalette.neutral[0]
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonActive: {
    backgroundColor: "rgba(255, 152, 0, 0.3)",
    borderWidth: 2,
    borderColor: colorPalette.warning[500],
  },
  zoomContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomIndicator: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    minWidth: 60,
    alignItems: "center",
  },
  zoomText: {
    color: colorPalette.neutral[0],
    fontSize: 14,
    fontWeight: "600",
  },
});
