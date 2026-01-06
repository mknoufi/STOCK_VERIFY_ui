/**
 * ScanAreaOverlay Component
 * Visual overlay showing the optimal scan area for 1D barcodes
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SCANNER_CONFIG } from '../../config/scannerConfig';

interface ScanAreaOverlayProps {
  /** Whether scanning is currently active */
  isScanning?: boolean;
  /** Visual feedback state */
  feedbackState?: 'idle' | 'success' | 'error';
  /** Custom scan area dimensions (overrides config) */
  scanAreaWidth?: number;
  scanAreaHeight?: number;
  /** Hint text to display */
  hintText?: string;
  /** Whether to show corner brackets */
  showCorners?: boolean;
  /** Whether to animate the scan line */
  animateScanLine?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ScanAreaOverlay: React.FC<ScanAreaOverlayProps> = ({
  isScanning = true,
  feedbackState = 'idle',
  scanAreaWidth,
  scanAreaHeight,
  hintText = 'Align barcode within the frame',
  showCorners = true,
  animateScanLine = true,
}) => {
  // Calculate scan area dimensions
  const areaWidth = scanAreaWidth || (SCREEN_WIDTH * SCANNER_CONFIG.scanArea.widthPercent / 100);
  const areaHeight = scanAreaHeight || (SCREEN_HEIGHT * SCANNER_CONFIG.scanArea.heightPercent / 100);

  // Animation for scanning line
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Animate scan line up and down
  useEffect(() => {
    if (!isScanning || !animateScanLine) {
      scanLineAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [isScanning, animateScanLine, scanLineAnim]);

  // Flash animation for feedback
  useEffect(() => {
    if (feedbackState === 'idle') {
      flashAnim.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: feedbackState === 'success'
          ? SCANNER_CONFIG.visualFeedback.successDuration - 150
          : SCANNER_CONFIG.visualFeedback.errorDuration - 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [feedbackState, flashAnim]);

  // Get border color based on feedback state
  const getBorderColor = () => {
    switch (feedbackState) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      default:
        return '#3B82F6';
    }
  };

  // Calculate scan line position
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, areaHeight - 4],
  });

  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Dark overlay areas */}
      <View style={[styles.overlay, styles.topOverlay, { height: (SCREEN_HEIGHT - areaHeight) / 2 + SCANNER_CONFIG.scanArea.verticalOffset }]} />
      <View style={styles.middleRow}>
        <View style={[styles.overlay, styles.sideOverlay, { width: (SCREEN_WIDTH - areaWidth) / 2 }]} />

        {/* Scan Area */}
        <View style={[styles.scanArea, { width: areaWidth, height: areaHeight }]}>
          {/* Flash overlay for feedback */}
          <Animated.View
            style={[
              styles.flashOverlay,
              {
                backgroundColor: feedbackState === 'success' ? '#22C55E' : '#EF4444',
                opacity: flashOpacity,
              },
            ]}
          />

          {/* Corner brackets */}
          {showCorners && (
            <>
              <View style={[styles.corner, styles.cornerTopLeft, { borderColor: getBorderColor() }]} />
              <View style={[styles.corner, styles.cornerTopRight, { borderColor: getBorderColor() }]} />
              <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: getBorderColor() }]} />
              <View style={[styles.corner, styles.cornerBottomRight, { borderColor: getBorderColor() }]} />
            </>
          )}

          {/* Animated scan line */}
          {isScanning && animateScanLine && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  backgroundColor: getBorderColor(),
                  transform: [{ translateY: scanLineTranslateY }],
                },
              ]}
            />
          )}

          {/* Center guide lines */}
          <View style={[styles.centerLineH, { backgroundColor: getBorderColor() }]} />
        </View>

        <View style={[styles.overlay, styles.sideOverlay, { width: (SCREEN_WIDTH - areaWidth) / 2 }]} />
      </View>
      <View style={[styles.overlay, styles.bottomOverlay, { height: (SCREEN_HEIGHT - areaHeight) / 2 - SCANNER_CONFIG.scanArea.verticalOffset }]} />

      {/* Hint text */}
      <View style={styles.hintContainer}>
        <Text style={[styles.hintText, feedbackState !== 'idle' && styles.hintTextFeedback]}>
          {feedbackState === 'success' ? '✓ Barcode Scanned!' :
           feedbackState === 'error' ? '✗ Invalid Barcode' :
           hintText}
        </Text>
        <Text style={styles.subHintText}>
          Position 1D barcode (EAN-13, Code 128) within the frame
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  topOverlay: {
    width: SCREEN_WIDTH,
  },
  bottomOverlay: {
    width: SCREEN_WIDTH,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideOverlay: {
    height: '100%',
  },
  scanArea: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  centerLineH: {
    position: 'absolute',
    left: '45%',
    right: '45%',
    top: '50%',
    height: 2,
    borderRadius: 1,
    opacity: 0.5,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hintTextFeedback: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default ScanAreaOverlay;
