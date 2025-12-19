/**
 * ErrorState Component
 * Displays error messages with retry functionality and helpful guidance
 *
 * Features:
 * - Multiple error type icons (network, validation, server, general)
 * - Retry button with loading state
 * - Accessibility labels for screen readers
 * - Responsive design for mobile and web
 * - Customizable error messages and actions
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModernButton } from "../ModernButton";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";

export type ErrorType = "network" | "validation" | "server" | "general";

interface ErrorStateProps {
  /** Error type determines icon and message tone */
  type?: ErrorType;
  /** Main error message */
  title: string;
  /** Detailed error description (optional) */
  description?: string;
  /** Retry button action */
  onRetry?: () => void;
  /** Additional action button */
  onSecondaryAction?: () => void;
  /** Secondary action label */
  secondaryActionLabel?: string;
  /** Show loading state on retry button */
  isRetrying?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Dismiss action */
  onDismiss?: () => void;
  /** Show dismiss button */
  showDismiss?: boolean;
  /** Technical error details (for debugging) */
  details?: string;
}

const getErrorConfig = (type: ErrorType) => {
  const configs: Record<ErrorType, { icon: string; color: string }> = {
    network: {
      icon: "wifi-off",
      color: modernColors.warning.main,
    },
    validation: {
      icon: "alert-circle",
      color: modernColors.error.main,
    },
    server: {
      icon: "server",
      color: modernColors.error.main,
    },
    general: {
      icon: "alert",
      color: modernColors.error.main,
    },
  };
  return configs[type];
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = "general",
  title,
  description,
  onRetry,
  onSecondaryAction,
  secondaryActionLabel = "Back",
  isRetrying = false,
  style,
  onDismiss,
  showDismiss = true,
  details,
}) => {
  const config = getErrorConfig(type);

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      scrollEnabled={!!description && description.length > 100}
      accessibilityRole="alert"
      accessible={true}
    >
      {/* Error Icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name={config.icon as any}
          size={64}
          color={config.color}
          accessibilityHidden={true}
        />
      </View>

      {/* Error Title */}
      <Text
        style={[styles.title, { color: config.color }]}
        accessibilityRole="header"
        accessibilityLabel={`Error: ${title}`}
      >
        {title}
      </Text>

      {/* Error Description */}
      {description && (
        <Text style={styles.description} accessibilityLiveRegion="polite">
          {description}
        </Text>
      )}

      {/* Technical Details (Dev Only) */}
      {__DEV__ && details && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsLabel}>Technical Details:</Text>
          <Text style={styles.detailsText}>{details}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {onRetry && (
          <ModernButton
            title={isRetrying ? "Retrying..." : "Retry"}
            onPress={onRetry}
            disabled={isRetrying}
            loading={isRetrying}
            variant="primary"
            fullWidth={true}
            accessibilityLabel={`Retry: ${title}`}
            testID="error-retry-button"
          />
        )}

        {onSecondaryAction && (
          <ModernButton
            title={secondaryActionLabel}
            onPress={onSecondaryAction}
            variant="outline"
            fullWidth={true}
            style={styles.secondaryButton}
            accessibilityLabel={secondaryActionLabel}
            testID="error-secondary-button"
          />
        )}

        {showDismiss && onDismiss && (
          <ModernButton
            title="Dismiss"
            onPress={onDismiss}
            variant="ghost"
            fullWidth={true}
            style={styles.dismissButton}
            accessibilityLabel="Dismiss error message"
            testID="error-dismiss-button"
          />
        )}
      </View>

      {/* Help Text */}
      {type === "network" && (
        <Text style={styles.helpText} accessibilityLiveRegion="polite">
          Please check your internet connection and try again.
        </Text>
      )}

      {type === "server" && (
        <Text style={styles.helpText} accessibilityLiveRegion="polite">
          Our servers are temporarily unavailable. Please try again later.
        </Text>
      )}

      {type === "validation" && (
        <Text style={styles.helpText} accessibilityLiveRegion="polite">
          Please check the highlighted fields and try again.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.xl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: modernSpacing.xl,
  },
  title: {
    ...modernTypography.h2,
    marginBottom: modernSpacing.md,
    textAlign: "center",
  },
  description: {
    ...modernTypography.body,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginBottom: modernSpacing.xl,
  },
  detailsBox: {
    backgroundColor: modernColors.error.light,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: modernColors.error.main,
  },
  detailsLabel: {
    ...modernTypography.label.small,
    fontWeight: "600" as const,
    color: modernColors.error.main,
    marginBottom: modernSpacing.sm,
  },
  detailsText: {
    ...modernTypography.label.small,
    color: modernColors.text.primary,
    fontFamily: "monospace",
  },
  buttonsContainer: {
    width: "100%",
    gap: modernSpacing.md,
  },
  secondaryButton: {
    marginTop: modernSpacing.md,
  },
  dismissButton: {
    marginTop: modernSpacing.sm,
  },
  helpText: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginTop: modernSpacing.lg,
    fontStyle: "italic",
  },
});
