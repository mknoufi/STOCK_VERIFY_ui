/**
 * Modal Component - Modern modal dialog
 * Safe, non-breaking addition to component library
 */

import React, { useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { BlurView } from 'expo-blur';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  animationType?: 'slide' | 'fade' | 'none';
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropPress = true,
  size = 'medium',
  animationType = 'fade',
}) => {
  const theme = useTheme();
  
  // Reanimated values for smooth animations
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateY = useSharedValue(50);

  // Prevent body scroll on web when modal is open
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      document.body.style.overflow = 'hidden';
    } else if (Platform.OS === 'web') {
      document.body.style.overflow = 'unset';
    }
    return () => {
      if (Platform.OS === 'web') {
        document.body.style.overflow = 'unset';
      }
    };
  }, [visible]);

  // Animate modal appearance/disappearance
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      });
      scale.value = withTiming(0.9, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      });
      translateY.value = withTiming(50, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible]);

  // Animated backdrop style
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Animated modal style
  const modalAnimatedStyle = useAnimatedStyle(() => {
    if (animationType === 'slide') {
      return {
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
      };
    } else if (animationType === 'fade') {
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
      };
    }
    return {
      opacity: opacity.value,
    };
  });

  const sizeStyles: Record<string, ViewStyle> = {
    small: { width: '80%' as const, maxWidth: 400 },
    medium: { width: '90%' as const, maxWidth: 600 },
    large: { width: '95%' as const, maxWidth: 900 },
    fullscreen: { width: '100%' as const, height: '100%' as const },
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={closeOnBackdropPress ? onClose : undefined}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >
              <Animated.View
                style={[
                  styles.modal,
                  sizeStyles[size],
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                  modalAnimatedStyle,
                ]}
              >
                {(title || showCloseButton) && (
                  <View
                    style={[
                      styles.header,
                      { borderBottomColor: theme.colors.border },
                    ]}
                  >
                    {title && (
                      <Text style={[styles.title, { color: theme.colors.text }]}>
                        {title}
                      </Text>
                    )}
                    {showCloseButton && (
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.contentContainer}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              </Animated.View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});

