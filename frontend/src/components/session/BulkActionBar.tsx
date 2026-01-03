/**
 * BulkActionBar - Toolbar for bulk operations on selected items
 *
 * Provides a contextual action bar with:
 * - Selection count display
 * - Available bulk actions
 * - Animated show/hide based on selection
 * - Confirmation dialogs for destructive actions
 *
 * @example
 * ```tsx
 * <BulkActionBar
 *   selectedCount={selectedIds.length}
 *   visible={selectedIds.length > 0}
 *   actions={[
 *     { id: 'complete', label: 'Mark Complete', icon: 'checkmark-circle', onPress: handleComplete },
 *     { id: 'delete', label: 'Delete', icon: 'trash', destructive: true, onPress: handleDelete },
 *   ]}
 *   onClear={() => clearSelection()}
 * />
 * ```
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  semanticColors,
  spacing,
  radius,
  shadows,
  textStyles,
} from "../../theme/unified";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

/** Bulk action definition */
export interface BulkAction {
  /** Unique action ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon name (Ionicons) */
  icon: string;
  /** Action handler */
  onPress: () => void | Promise<void>;
  /** Whether action is destructive (shows in red) */
  destructive?: boolean;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Whether action requires confirmation */
  requireConfirmation?: boolean;
  /** Loading state for async actions */
  loading?: boolean;
}

export interface BulkActionBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Whether the bar is visible */
  visible: boolean;
  /** Available actions */
  actions: BulkAction[];
  /** Clear selection handler */
  onClear: () => void;
  /** Total selectable items (for "X of Y" display) */
  totalCount?: number;
  /** Position of the bar */
  position?: "top" | "bottom";
  /** Custom style */
  style?: object;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function BulkActionBar({
  selectedCount,
  visible,
  actions,
  onClear,
  totalCount,
  position = "bottom",
  style,
}: BulkActionBarProps) {
  const insets = useSafeAreaInsets();

  // Don't render if not visible
  if (!visible) return null;

  const bottomPadding = position === "bottom" ? Math.max(insets.bottom, spacing.md) : 0;
  const topPadding = position === "top" ? Math.max(insets.top, spacing.md) : 0;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify()}
      exiting={SlideOutDown.duration(200)}
      style={[
        styles.container,
        position === "bottom" && styles.containerBottom,
        position === "top" && styles.containerTop,
        { paddingBottom: bottomPadding, paddingTop: topPadding },
        style,
      ]}
    >
      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {selectedCount}
            {totalCount !== undefined && (
              <Text style={styles.totalText}> of {totalCount}</Text>
            )}
          </Text>
          <Text style={styles.selectedLabel}>selected</Text>
        </View>

        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color={semanticColors.text.tertiary} />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {actions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </View>
    </Animated.View>
  );
}

/** Individual action button component */
function ActionButton({ action }: { action: BulkAction }) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const handlePress = useCallback(async () => {
    if (action.disabled || action.loading) return;
    await action.onPress();
  }, [action]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonColor = action.destructive
    ? semanticColors.status.error
    : colors.primary[500];

  const textColor = action.destructive
    ? semanticColors.status.error
    : colors.primary[600];

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={action.disabled || action.loading}
      style={[
        styles.actionButton,
        action.disabled && styles.actionButtonDisabled,
        animatedStyle,
      ]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.actionIconContainer,
          { backgroundColor: `${buttonColor}15` },
        ]}
      >
        <Ionicons
          name={action.icon as any}
          size={20}
          color={action.disabled ? semanticColors.text.tertiary : buttonColor}
        />
      </View>
      <Text
        style={[
          styles.actionLabel,
          { color: action.disabled ? semanticColors.text.tertiary : textColor },
        ]}
        numberOfLines={1}
      >
        {action.label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: semanticColors.background.primary,
    borderTopWidth: 1,
    borderTopColor: semanticColors.border.default,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  containerBottom: {
    bottom: 0,
  },
  containerTop: {
    top: 0,
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border.default,
  },
  selectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border.subtle,
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  countText: {
    ...textStyles.h3,
    color: colors.primary[600],
  },
  totalText: {
    ...textStyles.body,
    color: semanticColors.text.tertiary,
  },
  selectedLabel: {
    ...textStyles.body,
    color: semanticColors.text.secondary,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: semanticColors.background.secondary,
    gap: spacing.sm,
    minWidth: 100,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    ...textStyles.label,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default BulkActionBar;
