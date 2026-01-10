/**
 * ItemActionsFooter Component
 * Reusable footer with action buttons for item detail screens
 * Provides consistent action handling across verify, approve, reject, save flows
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../ui/GlassCard";
import { AnimatedPressable } from "../ui/AnimatedPressable";
import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export type ActionType = 
  | "save" 
  | "verify" 
  | "approve" 
  | "reject" 
  | "recount" 
  | "unverify" 
  | "cancel"
  | "custom";

export interface ActionButton {
  type: ActionType;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning";
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export interface ItemActionsFooterProps {
  actions: ActionButton[];
  processing?: boolean;
  animationDelay?: number;
  style?: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getDefaultsForAction = (type: ActionType): { label: string; icon: keyof typeof Ionicons.glyphMap; variant: ActionButton["variant"] } => {
  switch (type) {
    case "save":
      return { label: "Save & Verify", icon: "checkmark-circle", variant: "primary" };
    case "verify":
      return { label: "Verify Stock", icon: "checkmark-circle-outline", variant: "success" };
    case "approve":
      return { label: "Approve", icon: "checkmark", variant: "success" };
    case "reject":
      return { label: "Reject", icon: "close", variant: "danger" };
    case "recount":
      return { label: "Request Recount", icon: "refresh", variant: "warning" };
    case "unverify":
      return { label: "Remove Verification", icon: "close-circle-outline", variant: "secondary" };
    case "cancel":
      return { label: "Cancel", icon: "arrow-back", variant: "secondary" };
    default:
      return { label: "Action", icon: "ellipse", variant: "secondary" };
  }
};

const getVariantStyles = (variant: ActionButton["variant"]) => {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: theme.colors.primary[500],
        textColor: "#fff",
        shadowColor: theme.colors.primary[500],
      };
    case "success":
      return {
        backgroundColor: theme.colors.success.main,
        textColor: "#fff",
        shadowColor: theme.colors.success.main,
      };
    case "danger":
      return {
        backgroundColor: theme.colors.error.main,
        textColor: "#fff",
        shadowColor: theme.colors.error.main,
      };
    case "warning":
      return {
        backgroundColor: theme.colors.warning.main,
        textColor: "#fff",
        shadowColor: theme.colors.warning.main,
      };
    case "secondary":
    default:
      return {
        backgroundColor: "rgba(255,255,255,0.05)",
        textColor: theme.colors.text.primary,
        shadowColor: "transparent",
      };
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemActionsFooter: React.FC<ItemActionsFooterProps> = ({
  actions,
  processing = false,
  animationDelay = 0,
  style,
}) => {
  const handlePress = async (action: ActionButton) => {
    if (action.disabled || action.loading || processing) return;
    
    if (Platform.OS !== "web") {
      const feedbackType = action.variant === "danger" 
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(feedbackType);
    }
    
    await action.onPress();
  };
  
  const renderAction = (action: ActionButton, index: number) => {
    const defaults = getDefaultsForAction(action.type);
    const label = action.label || defaults.label;
    const icon = action.icon || defaults.icon;
    const variant = action.variant || defaults.variant;
    const variantStyles = getVariantStyles(variant);
    
    const isDisabled = action.disabled || action.loading || processing;
    const isLoading = action.loading || (processing && index === actions.length - 1);
    
    const isSecondary = variant === "secondary";
    
    return (
      <AnimatedPressable
        key={`${action.type}-${index}`}
        onPress={() => handlePress(action)}
        disabled={isDisabled}
        style={[
          styles.actionButton,
          { backgroundColor: variantStyles.backgroundColor },
          isSecondary && styles.secondaryButton,
          !isSecondary && {
            shadowColor: variantStyles.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          },
          isDisabled && styles.disabledButton,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={variantStyles.textColor} />
        ) : (
          <>
            <Ionicons
              name={icon}
              size={20}
              color={variantStyles.textColor}
            />
            <Text style={[styles.actionText, { color: variantStyles.textColor }]}>
              {label}
            </Text>
          </>
        )}
      </AnimatedPressable>
    );
  };
  
  const content = (
    <View style={[styles.container, style]}>
      <GlassCard
        intensity={15}
        padding={theme.spacing.md}
        borderRadius={theme.borderRadius.xl}
        style={styles.footerCard}
      >
        <View style={styles.actionsRow}>
          {actions.map(renderAction)}
        </View>
      </GlassCard>
    </View>
  );
  
  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInUp.delay(animationDelay).springify()}>
        {content}
      </Animated.View>
    );
  }
  
  return content;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === "ios" ? theme.spacing.xl : theme.spacing.md,
  },
  footerCard: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    height: 50,
    borderRadius: theme.borderRadius.full,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ItemActionsFooter;
