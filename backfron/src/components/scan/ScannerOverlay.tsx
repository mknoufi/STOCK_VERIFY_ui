/**
 * ScannerOverlay - Premium camera scanner overlay with animations
 * Features: Animated corners, scanning line, status feedback
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from '../../styles/modernDesignSystem';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

interface ScannerOverlayProps {
  isActive?: boolean;
  status?: 'scanning' | 'success' | 'error' | 'idle';
  message?: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  isActive = true,
  status = 'scanning',
  message,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cornerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Corner entrance animation
    Animated.spring(cornerAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Scanning line animation
    if (isActive && status === 'scanning') {
      Animated.loop(
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
      ).start();
    }

    // Pulse animation for success/error
    if (status === 'success' || status === 'error') {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, status, scanLineAnim, pulseAnim, cornerAnim]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return modernColors.success.main;
      case 'error':
        return modernColors.error.main;
      default:
        return modernColors.primary[400];
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      default:
        return 'scan';
    }
  };

  const cornerSize = 40;
  const cornerThickness = 4;
  const statusColor = getStatusColor();

  const Corner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
    const positionStyles = {
      tl: { top: 0, left: 0, borderTopWidth: cornerThickness, borderLeftWidth: cornerThickness },
      tr: { top: 0, right: 0, borderTopWidth: cornerThickness, borderRightWidth: cornerThickness },
      bl: { bottom: 0, left: 0, borderBottomWidth: cornerThickness, borderLeftWidth: cornerThickness },
      br: { bottom: 0, right: 0, borderBottomWidth: cornerThickness, borderRightWidth: cornerThickness },
    };

    return (
      <Animated.View
        style={[
          styles.corner,
          positionStyles[position],
          {
            width: cornerSize,
            height: cornerSize,
            borderColor: statusColor,
            opacity: cornerAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            {/* Corners */}
            <Corner position="tl" />
            <Corner position="tr" />
            <Corner position="bl" />
            <Corner position="br" />

            {/* Scanning line */}
            {isActive && status === 'scanning' && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineTranslate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['transparent', statusColor, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanLineGradient}
                />
              </Animated.View>
            )}

            {/* Status icon overlay */}
            {(status === 'success' || status === 'error') && (
              <Animated.View
                style={[
                  styles.statusOverlay,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.statusIconContainer, { backgroundColor: statusColor + '30' }]}>
                  <Ionicons name={getStatusIcon()} size={64} color={statusColor} />
                </View>
              </Animated.View>
            )}
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionsBadge}>
          <Ionicons
            name={getStatusIcon()}
            size={20}
            color={statusColor}
            style={styles.instructionsIcon}
          />
          <Text style={styles.instructionsText}>
            {message || (status === 'scanning' ? 'Position barcode within frame' : '')}
          </Text>
        </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  corner: {
    position: 'absolute',
    borderRadius: 2,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  scanLineGradient: {
    flex: 1,
    borderRadius: 2,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 150 : 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.sm,
    borderRadius: 24,
    gap: 8,
  },
  instructionsIcon: {},
  instructionsText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
});

export default ScannerOverlay;
