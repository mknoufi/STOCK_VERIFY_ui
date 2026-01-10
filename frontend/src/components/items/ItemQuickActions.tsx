/**
 * ItemQuickActions Component
 * Floating quick action buttons for common item operations
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface ItemQuickActionsProps {
  actions: QuickAction[];
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  mainIcon?: string;
  mainColor?: string;
}

// ============================================================================
// Animated Action Button
// ============================================================================

interface ActionButtonProps {
  action: QuickAction;
  index: number;
  isExpanded: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  index,
  isExpanded,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const translateY = withSpring(
      isExpanded ? -(index + 1) * 64 : 0,
      { damping: 12, stiffness: 180 }
    );

    const scale = withSpring(isExpanded ? 1 : 0.5, { damping: 15 });
    const opacity = withTiming(isExpanded ? 1 : 0, { duration: 150 });

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const handlePress = () => {
    if (action.disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  const buttonColor = action.color || theme.colors.primary[500];

  return (
    <AnimatedTouchable
      style={[
        styles.actionButton,
        animatedStyle,
        action.disabled && styles.actionButtonDisabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={action.disabled}
    >
      {/* Label */}
      {isExpanded && (
        <Animated.View entering={FadeIn.delay(index * 30)} style={styles.labelContainer}>
          <BlurView intensity={80} style={styles.labelBlur}>
            <Text style={styles.labelText}>{action.label}</Text>
          </BlurView>
        </Animated.View>
      )}

      {/* Icon Button */}
      <View
        style={[
          styles.actionIconContainer,
          { backgroundColor: buttonColor + (action.disabled ? "40" : "") },
        ]}
      >
        <Ionicons
          name={action.icon as any}
          size={22}
          color={action.disabled ? theme.colors.neutral[500] : "#fff"}
        />
      </View>
    </AnimatedTouchable>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemQuickActions: React.FC<ItemQuickActionsProps> = ({
  actions,
  position = "bottom-right",
  mainIcon = "add",
  mainColor = theme.colors.primary[500],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const toggleExpanded = () => {
    Haptics.impactAsync(
      isExpanded
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    rotation.value = withSpring(isExpanded ? 0 : 45, { damping: 15 });
    setIsExpanded(!isExpanded);
  };

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getPositionStyle = () => {
    switch (position) {
      case "bottom-left":
        return { left: theme.spacing.lg };
      case "bottom-center":
        return { alignSelf: "center" as const };
      default:
        return { right: theme.spacing.lg };
    }
  };

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => setIsExpanded(false)}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <ActionButton
            key={action.id}
            action={action}
            index={index}
            isExpanded={isExpanded}
          />
        ))}

        {/* Main FAB */}
        <AnimatedTouchable
          style={[styles.mainButton, { backgroundColor: mainColor }]}
          onPress={toggleExpanded}
          activeOpacity={0.9}
        >
          <Animated.View style={mainButtonStyle}>
            <Ionicons name={mainIcon as any} size={28} color="#fff" />
          </Animated.View>
        </AnimatedTouchable>
      </View>
    </View>
  );
};

// ============================================================================
// Preset Configurations
// ============================================================================

export function createItemQuickActions(handlers: {
  onScan?: () => void;
  onPhoto?: () => void;
  onNote?: () => void;
  onShare?: () => void;
  onRefresh?: () => void;
}): QuickAction[] {
  const actions: QuickAction[] = [];

  if (handlers.onScan) {
    actions.push({
      id: "scan",
      icon: "barcode",
      label: "Scan Barcode",
      color: theme.colors.primary[500],
      onPress: handlers.onScan,
    });
  }

  if (handlers.onPhoto) {
    actions.push({
      id: "photo",
      icon: "camera",
      label: "Take Photo",
      color: theme.colors.info.main,
      onPress: handlers.onPhoto,
    });
  }

  if (handlers.onNote) {
    actions.push({
      id: "note",
      icon: "chatbubble",
      label: "Add Note",
      color: theme.colors.warning.main,
      onPress: handlers.onNote,
    });
  }

  if (handlers.onShare) {
    actions.push({
      id: "share",
      icon: "share",
      label: "Share",
      color: theme.colors.success.main,
      onPress: handlers.onShare,
    });
  }

  if (handlers.onRefresh) {
    actions.push({
      id: "refresh",
      icon: "refresh",
      label: "Refresh ERP",
      color: theme.colors.neutral[600],
      onPress: handlers.onRefresh,
    });
  }

  return actions;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    zIndex: 100,
  },
  backdrop: {
    position: "absolute",
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -200,
  },
  actionsContainer: {
    alignItems: "center",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  labelContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
  },
  labelBlur: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor:
      Platform.OS === "ios" ? "transparent" : "rgba(0, 0, 0, 0.7)",
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    color: Platform.OS === "ios" ? theme.colors.text.primary : "#fff",
  },
});

export default ItemQuickActions;
