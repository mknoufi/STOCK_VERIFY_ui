/**
 * ConfirmModal Component
 *
 * A specialized modal for confirmation dialogs with confirm/cancel actions.
 * Supports danger mode for destructive actions, loading states, and custom messaging.
 *
 * @module components/ui/ConfirmModal
 *
 * @example
 * ```tsx
 * <ConfirmModal
 *   visible={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   title="Delete Items"
 *   message="Are you sure you want to delete 5 items? This cannot be undone."
 *   confirmLabel="Delete"
 *   danger
 *   onConfirm={handleDelete}
 *   loading={isDeleting}
 * />
 * ```
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "./Modal";
import {
  colors,
  semanticColors,
  spacing,
  radius,
  textStyles,
} from "../../theme/unified";

export type ConfirmModalVariant = "default" | "danger" | "warning" | "success";

export interface ConfirmModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Optional additional details or description */
  details?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Called when confirm is pressed */
  onConfirm: () => void | Promise<void>;
  /** Called when cancel is pressed (defaults to onClose) */
  onCancel?: () => void;
  /** Visual variant (danger for destructive actions) */
  variant?: ConfirmModalVariant;
  /** Shorthand for variant="danger" */
  danger?: boolean;
  /** Whether confirm action is in progress */
  loading?: boolean;
  /** Whether to show a loading spinner on confirm button */
  showLoadingSpinner?: boolean;
  /** Icon to display in the modal */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Whether to close modal automatically after confirm */
  closeOnConfirm?: boolean;
  /** Disable confirm button */
  confirmDisabled?: boolean;
  /** Number of items affected (for bulk operations) */
  affectedCount?: number;
}

const VARIANT_CONFIG: Record<
  ConfirmModalVariant,
  {
    color: string;
    backgroundColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  default: {
    color: colors.primary[500],
    backgroundColor: colors.primary[50],
    icon: "help-circle",
  },
  danger: {
    color: colors.error[500],
    backgroundColor: colors.error[50],
    icon: "warning",
  },
  warning: {
    color: colors.warning[500],
    backgroundColor: colors.warning[50],
    icon: "alert-circle",
  },
  success: {
    color: colors.success[500],
    backgroundColor: colors.success[50],
    icon: "checkmark-circle",
  },
};

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  danger = false,
  loading = false,
  showLoadingSpinner = true,
  icon,
  closeOnConfirm = true,
  confirmDisabled = false,
  affectedCount,
}: ConfirmModalProps): React.ReactElement {
  // Resolve variant (danger prop takes precedence)
  const resolvedVariant = danger ? "danger" : variant;
  const config = VARIANT_CONFIG[resolvedVariant];
  const iconName = icon ?? config.icon;

  const handleConfirm = async () => {
    if (loading || confirmDisabled) return;

    try {
      await onConfirm();
      if (closeOnConfirm) {
        onClose();
      }
    } catch (_error) {
      // Error handling should be done in onConfirm
      // Modal stays open on error for retry
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      size="small"
      showCloseButton={false}
      closeOnBackdropPress={!loading}
    >
      <Animated.View
        entering={SlideInDown.springify().damping(15)}
        exiting={SlideOutDown.duration(200)}
        style={styles.container}
      >
        {/* Icon */}
        <Animated.View
          entering={FadeIn.delay(100)}
          style={[
            styles.iconContainer,
            { backgroundColor: config.backgroundColor },
          ]}
        >
          <Ionicons name={iconName} size={32} color={config.color} />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Affected count badge */}
        {affectedCount !== undefined && affectedCount > 0 && (
          <Animated.View
            entering={FadeIn.delay(150)}
            style={[
              styles.countBadge,
              { backgroundColor: config.backgroundColor },
            ]}
          >
            <Text style={[styles.countText, { color: config.color }]}>
              {affectedCount} item{affectedCount !== 1 ? "s" : ""} will be
              affected
            </Text>
          </Animated.View>
        )}

        {/* Details */}
        {details && <Text style={styles.details}>{details}</Text>}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: config.color },
              (loading || confirmDisabled) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={loading || confirmDisabled}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
          >
            {loading && showLoadingSpinner ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing["2xl"],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.h3,
    color: semanticColors.text.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...textStyles.body,
    color: semanticColors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  countBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  countText: {
    ...textStyles.label,
    fontWeight: "600",
  },
  details: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semanticColors.background.primary,
  },
  cancelText: {
    ...textStyles.label,
    color: semanticColors.text.secondary,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    ...textStyles.label,
    color: "#fff",
    fontWeight: "600",
  },
});

export default ConfirmModal;
