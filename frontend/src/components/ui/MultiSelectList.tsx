/**
 * MultiSelectList - Selectable list component for bulk operations
 *
 * Provides a list with:
 * - Individual item selection
 * - Select all / deselect all
 * - Selection count display
 * - Animated selection states
 *
 * @example
 * ```tsx
 * <MultiSelectList
 *   items={sessions}
 *   renderItem={(item, isSelected) => <SessionRow {...item} selected={isSelected} />}
 *   keyExtractor={(item) => item.id}
 *   onSelectionChange={(selectedIds) => setSelectedIds(selectedIds)}
 * />
 * ```
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform as _Platform,
} from "react-native";
import { FlashList, FlashListProps } from "@shopify/flash-list";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  semanticColors,
  spacing,
  radius,
  shadows as _shadows,
  textStyles,
} from "../../theme/unified";

/** Generic item type constraint */
export interface SelectableItem {
  id: string;
  disabled?: boolean;
}

export interface MultiSelectListProps<T extends SelectableItem> {
  /** List of items */
  items: T[];
  /** Render function for each item */
  renderItem: (
    item: T,
    isSelected: boolean,
    index: number,
  ) => React.ReactElement;
  /** Key extractor */
  keyExtractor?: (item: T, index: number) => string;
  /** Called when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Initially selected item IDs */
  initialSelection?: string[];
  /** Maximum number of selectable items (0 = unlimited) */
  maxSelection?: number;
  /** Show select all header */
  showSelectAll?: boolean;
  /** Select all label */
  selectAllLabel?: string;
  /** Empty state component */
  EmptyComponent?: React.ReactNode;
  /** Whether selection mode is active */
  selectionMode?: boolean;
  /** Callback when selection mode should change */
  onSelectionModeChange?: (active: boolean) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function MultiSelectList<T extends SelectableItem>({
  items,
  renderItem,
  keyExtractor = (item) => item.id,
  onSelectionChange,
  initialSelection = [],
  maxSelection = 0,
  showSelectAll = true,
  selectAllLabel = "Select All",
  EmptyComponent,
  selectionMode = true,
  onSelectionModeChange: _onSelectionModeChange,
  ...flatListProps
}: MultiSelectListProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelection),
  );

  // Animation values for header
  const headerScale = useSharedValue(1);

  // Selectable items (excluding disabled)
  const selectableItems = useMemo(
    () => items.filter((item) => !item.disabled),
    [items],
  );

  // Check if all items are selected
  const allSelected = useMemo(
    () =>
      selectableItems.length > 0 &&
      selectableItems.every((item) => selectedIds.has(item.id)),
    [selectableItems, selectedIds],
  );

  // Check if some items are selected
  const someSelected = useMemo(
    () => selectedIds.size > 0 && !allSelected,
    [selectedIds.size, allSelected],
  );

  // Toggle item selection
  const toggleItem = useCallback(
    (itemId: string) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          // Check max selection limit
          if (maxSelection > 0 && newSet.size >= maxSelection) {
            return prev; // Don't add more
          }
          newSet.add(itemId);
        }
        const newArray = Array.from(newSet);
        onSelectionChange(newArray);
        return newSet;
      });
    },
    [maxSelection, onSelectionChange],
  );

  // Toggle all items
  const toggleAll = useCallback(() => {
    headerScale.value = withSpring(0.95, {}, () => {
      headerScale.value = withSpring(1);
    });

    setSelectedIds((_prev) => {
      if (allSelected) {
        // Deselect all
        onSelectionChange([]);
        return new Set();
      } else {
        // Select all (respecting max limit)
        const itemsToSelect =
          maxSelection > 0
            ? selectableItems.slice(0, maxSelection)
            : selectableItems;
        const newIds = itemsToSelect.map((item) => item.id);
        onSelectionChange(newIds);
        return new Set(newIds);
      }
    });
  }, [
    allSelected,
    selectableItems,
    maxSelection,
    onSelectionChange,
    headerScale,
  ]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Header animation style
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  // Render item wrapper
  const renderItemWrapper = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const isSelected = selectedIds.has(item.id);
      const isDisabled = item.disabled;

      return (
        <SelectableItemWrapper
          onPress={() => !isDisabled && toggleItem(item.id)}
          isSelected={isSelected}
          isDisabled={isDisabled}
          selectionMode={selectionMode}
        >
          {renderItem(item, isSelected, index)}
        </SelectableItemWrapper>
      );
    },
    [selectedIds, toggleItem, renderItem, selectionMode],
  );

  // Empty component
  const renderEmpty = () => {
    if (EmptyComponent) return EmptyComponent;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="document-outline"
          size={48}
          color={semanticColors.text.tertiary}
        />
        <Text style={styles.emptyText}>No items to display</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selection Header */}
      {showSelectAll && selectionMode && items.length > 0 && (
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity
            style={styles.selectAllRow}
            onPress={toggleAll}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                allSelected && styles.checkboxSelected,
                someSelected && styles.checkboxPartial,
              ]}
            >
              {allSelected && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
              {someSelected && <View style={styles.partialIndicator} />}
            </View>
            <Text style={styles.selectAllText}>{selectAllLabel}</Text>
          </TouchableOpacity>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>
              {selectedIds.size} selected
            </Text>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                onPress={clearSelection}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* List */}
      <FlashList
        data={items}
        renderItem={renderItemWrapper}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
        // @ts-ignore - estimatedItemSize required by FlashList
        estimatedItemSize={70}
      />
    </View>
  );
}

/** Wrapper component for selectable items */
interface SelectableItemWrapperProps {
  children: React.ReactNode;
  onPress: () => void;
  isSelected: boolean;
  isDisabled?: boolean;
  selectionMode: boolean;
}

function SelectableItemWrapper({
  children,
  onPress,
  isSelected,
  isDisabled,
  selectionMode,
}: SelectableItemWrapperProps) {
  const animatedProgress = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    animatedProgress.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      animatedProgress.value,
      [0, 1],
      ["transparent", colors.primary[50]],
    ),
    borderColor: interpolateColor(
      animatedProgress.value,
      [0, 1],
      [semanticColors.border.default, colors.primary[300]],
    ),
  }));

  if (!selectionMode) {
    return <View style={styles.itemWrapper}>{children}</View>;
  }

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[
        styles.itemWrapper,
        styles.selectableItem,
        animatedStyle,
        isDisabled && styles.disabledItem,
      ]}
    >
      {/* Selection checkbox */}
      <View
        style={[
          styles.itemCheckbox,
          isSelected && styles.itemCheckboxSelected,
          isDisabled && styles.itemCheckboxDisabled,
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={styles.itemContent}>{children}</View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: semanticColors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border.default,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: semanticColors.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semanticColors.background.primary,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkboxPartial: {
    borderColor: colors.primary[500],
    backgroundColor: semanticColors.background.primary,
  },
  partialIndicator: {
    width: 10,
    height: 2,
    backgroundColor: colors.primary[500],
    borderRadius: 1,
  },
  selectAllText: {
    ...textStyles.label,
    fontWeight: "600",
    color: semanticColors.text.primary,
  },
  selectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectionCount: {
    ...textStyles.caption,
    color: semanticColors.text.secondary,
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    ...textStyles.caption,
    color: colors.primary[500],
    fontWeight: "600",
  },
  itemWrapper: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  selectableItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    overflow: "hidden",
  },
  disabledItem: {
    opacity: 0.5,
  },
  itemCheckbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: semanticColors.border.default,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  itemCheckboxSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  itemCheckboxDisabled: {
    backgroundColor: semanticColors.background.tertiary,
    borderColor: semanticColors.border.default,
  },
  itemContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },
  emptyText: {
    ...textStyles.body,
    color: semanticColors.text.tertiary,
    marginTop: spacing.md,
  },
  emptyList: {
    flex: 1,
  },
});

export default MultiSelectList;
