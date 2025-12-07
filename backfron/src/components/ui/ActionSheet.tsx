/**
 * ActionSheet - Premium action sheet with gesture support
 * Features: Animated entrance, haptic feedback, icons support
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from '../../styles/modernDesignSystem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActionSheetAction {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Cancel',
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleAction = (action: ActionSheetAction) => {
    if (action.disabled) return;

    Haptics.selectionAsync();
    onClose();
    setTimeout(() => action.onPress(), 200);
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCancel}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={styles.androidBackdrop} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + modernSpacing.md,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  index === 0 && styles.actionButtonFirst,
                  action.disabled && styles.actionButtonDisabled,
                ]}
                onPress={() => handleAction(action)}
                activeOpacity={action.disabled ? 1 : 0.7}
              >
                {action.icon && (
                  <Ionicons
                    name={action.icon}
                    size={22}
                    color={
                      action.disabled
                        ? modernColors.text.disabled
                        : action.destructive
                        ? modernColors.error.main
                        : modernColors.text.primary
                    }
                    style={styles.actionIcon}
                  />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    action.destructive && styles.actionLabelDestructive,
                    action.disabled && styles.actionLabelDisabled,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: modernColors.background.paper,
    borderTopLeftRadius: modernBorderRadius.xl,
    borderTopRightRadius: modernBorderRadius.xl,
    paddingHorizontal: modernSpacing.md,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: modernSpacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: modernColors.neutral[600],
  },
  header: {
    paddingHorizontal: modernSpacing.md,
    paddingBottom: modernSpacing.md,
    alignItems: 'center',
  },
  title: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    textAlign: 'center',
  },
  message: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.lg,
    overflow: 'hidden',
    marginBottom: modernSpacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  actionButtonFirst: {
    borderTopWidth: 0,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    marginRight: modernSpacing.sm,
  },
  actionLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: '500',
  },
  actionLabelDestructive: {
    color: modernColors.error.main,
  },
  actionLabelDisabled: {
    color: modernColors.text.disabled,
  },
  cancelButton: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.lg,
    paddingVertical: modernSpacing.md,
    alignItems: 'center',
  },
  cancelLabel: {
    ...modernTypography.body.medium,
    color: modernColors.primary[400],
    fontWeight: '600',
  },
});

export default ActionSheet;
