/**
 * ScanGuideOverlay Component
 * Visual guide for optimal barcode scanning
 * Phase 0: Enhanced Mobile Camera Features
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colorPalette, spacing, typography } from "@/theme/designTokens";
import type { ScanRegion } from "@/services/cameraEnhancementService";

interface ScanGuideOverlayProps {
  scanRegion: ScanRegion;
  isScanning?: boolean;
  message?: string;
}

export const ScanGuideOverlay: React.FC<ScanGuideOverlayProps> = ({
  scanRegion,
  isScanning = false,
  message = "Align barcode within the frame",
}) => {
  const scanLinePosition = useSharedValue(0);
  const cornerOpacity = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      // Animate scan line
      scanLinePosition.value = withRepeat(
        withSequence(
          withTiming(scanRegion.height, { duration: 1500 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
        false,
      );

      // Pulse corners
      cornerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      scanLinePosition.value = 0;
      cornerOpacity.value = 1;
    }
  }, [isScanning, scanRegion.height, cornerOpacity, scanLinePosition]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: cornerOpacity.value,
  }));

  const cornerSize = 30;
  const cornerThickness = 4;

  return (
    <View style={styles.container}>
      {/* Dimmed overlay */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={[styles.dimmed, { height: scanRegion.y }]} />

        {/* Middle row */}
        <View style={[styles.row, { height: scanRegion.height }]}>
          <View style={[styles.dimmed, { width: scanRegion.x }]} />

          {/* Scan region */}
          <View
            style={[
              styles.scanRegion,
              {
                width: scanRegion.width,
                height: scanRegion.height,
              },
            ]}
          >
            {/* Corner guides */}
            <Animated.View style={[styles.cornerContainer, cornerStyle]}>
              {/* Top-left */}
              <View
                style={[
                  styles.corner,
                  styles.cornerTopLeft,
                  { width: cornerSize, height: cornerSize },
                ]}
              >
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineHorizontal,
                    { height: cornerThickness },
                  ]}
                />
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineVertical,
                    { width: cornerThickness },
                  ]}
                />
              </View>

              {/* Top-right */}
              <View
                style={[
                  styles.corner,
                  styles.cornerTopRight,
                  { width: cornerSize, height: cornerSize },
                ]}
              >
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineHorizontal,
                    { height: cornerThickness },
                  ]}
                />
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineVertical,
                    { width: cornerThickness },
                  ]}
                />
              </View>

              {/* Bottom-left */}
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomLeft,
                  { width: cornerSize, height: cornerSize },
                ]}
              >
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineHorizontal,
                    { height: cornerThickness },
                  ]}
                />
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineVertical,
                    { width: cornerThickness },
                  ]}
                />
              </View>

              {/* Bottom-right */}
              <View
                style={[
                  styles.corner,
                  styles.cornerBottomRight,
                  { width: cornerSize, height: cornerSize },
                ]}
              >
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineHorizontal,
                    { height: cornerThickness },
                  ]}
                />
                <View
                  style={[
                    styles.cornerLine,
                    styles.cornerLineVertical,
                    { width: cornerThickness },
                  ]}
                />
              </View>
            </Animated.View>

            {/* Scan line */}
            {isScanning && (
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            )}
          </View>

          <View style={[styles.dimmed, { flex: 1 }]} />
        </View>

        {/* Bottom */}
        <View style={[styles.dimmed, { flex: 1 }]} />
      </View>

      {/* Message */}
      <View
        style={[
          styles.messageContainer,
          { top: scanRegion.y + scanRegion.height + spacing.lg },
        ]}
      >
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
  overlay: {
    flex: 1,
  },
  dimmed: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  row: {
    flexDirection: "row",
  },
  scanRegion: {
    position: "relative",
  },
  cornerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
  },
  cornerLine: {
    backgroundColor: colorPalette.primary[500],
    position: "absolute",
  },
  cornerLineHorizontal: {
    width: "100%",
    top: 0,
  },
  cornerLineVertical: {
    height: "100%",
    left: 0,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colorPalette.primary[500],
    shadowColor: colorPalette.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  messageContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  message: {
    color: colorPalette.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
});
