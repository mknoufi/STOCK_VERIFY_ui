/**
 * ScanFeedback Component
 * Visual feedback indicators for barcode scanning results
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
import { Ionicons } from '@expo/vector-icons';
import { SCANNER_CONFIG } from '../../config/scannerConfig';
import { defaultTheme as theme } from "@/theme/themes";

interface ScanFeedbackProps {
  /** Type of feedback to display */
  type: 'success' | 'error' | 'none';
  /** Scanned barcode value */
  barcode?: string;
  /** Item name if found */
  itemName?: string;
  /** Error message if any */
  errorMessage?: string;
  /** Callback when feedback animation completes */
  onComplete?: () => void;
  /** Duration of feedback display (ms) */
  duration?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({
  type,
  barcode,
  itemName,
  errorMessage,
  onComplete,
  duration,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;

  const feedbackDuration = duration || (
    type === 'success'
      ? SCANNER_CONFIG.visualFeedback.successDuration
      : SCANNER_CONFIG.visualFeedback.errorDuration
  );

  useEffect(() => {
    if (type === 'none') {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.5);
      translateYAnim.setValue(50);
      return;
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit animation after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, feedbackDuration - 200);

    return () => clearTimeout(timer);
  }, [type, feedbackDuration, opacityAnim, scaleAnim, translateYAnim, onComplete]);

  if (type === 'none') return null;

  const isSuccess = type === 'success';
  const backgroundColor = isSuccess ? '#22C55E' : theme.colors.danger;
  const iconName = isSuccess ? 'checkmark-circle' : 'close-circle';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
    >
      <View style={[styles.card, { backgroundColor }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={40} color="#fff" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            {isSuccess ? 'Scan Successful!' : 'Scan Failed'}
          </Text>
          {barcode && (
            <Text style={styles.barcode}>{barcode}</Text>
          )}
          {itemName && (
            <Text style={styles.itemName} numberOfLines={2}>
              {itemName}
            </Text>
          )}
          {errorMessage && (
            <Text style={styles.errorMessage} numberOfLines={2}>
              {errorMessage}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Floating toast version of scan feedback
 */
interface ScanToastProps {
  visible: boolean;
  type: 'success' | 'error';
  message: string;
  onHide?: () => void;
  duration?: number;
}

export const ScanToast: React.FC<ScanToastProps> = ({
  visible,
  type,
  message,
  onHide,
  duration = 2000,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacityAnim.setValue(0);
      translateYAnim.setValue(-100);
      return undefined;
    }
  }, [visible, duration, opacityAnim, translateYAnim, onHide]);

  if (!visible) return null;

  const backgroundColor = type === 'success' ? '#22C55E' : theme.colors.danger;
  const iconName = type === 'success' ? 'checkmark-circle' : 'close-circle';

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
          backgroundColor,
        },
      ]}
    >
      <Ionicons name={iconName} size={24} color="#fff" />
      <Text style={styles.toastMessage} numberOfLines={1}>
        {message}
      </Text>
    </Animated.View>
  );
};

/**
 * Scan indicator - shows scanning status
 */
interface ScanIndicatorProps {
  isScanning: boolean;
  scannedCount?: number;
}

export const ScanIndicator: React.FC<ScanIndicatorProps> = ({
  isScanning,
  scannedCount = 0,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [isScanning, pulseAnim]);

  return (
    <View style={styles.indicatorContainer}>
      <Animated.View
        style={[
          styles.indicatorDot,
          isScanning && styles.indicatorDotActive,
          { transform: [{ scale: isScanning ? pulseAnim : 1 }] },
        ]}
      />
      <Text style={styles.indicatorText}>
        {isScanning ? 'Scanning...' : `${scannedCount} scanned`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: SCREEN_WIDTH - 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barcode: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  itemName: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
  },
  errorMessage: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1001,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastMessage: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  // Indicator styles
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.muted,
    marginRight: 8,
  },
  indicatorDotActive: {
    backgroundColor: '#22C55E',
  },
  indicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ScanFeedback;
