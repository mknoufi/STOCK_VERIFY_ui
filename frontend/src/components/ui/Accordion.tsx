/**
 * Accordion Component
 * Collapsible content sections
 * Phase 2: Design System - Core Components
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "@/theme/designTokens";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface AccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  defaultExpanded?: string[];
  onItemToggle?: (id: string, isExpanded: boolean) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  multiple = false,
  defaultExpanded = [],
  onItemToggle,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(defaultExpanded),
  );

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      const isExpanding = !newSet.has(id);

      if (multiple) {
        if (isExpanding) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      } else {
        newSet.clear();
        if (isExpanding) {
          newSet.add(id);
        }
      }

      onItemToggle?.(id, isExpanding);
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <AccordionItemComponent
          key={item.id}
          item={item}
          isExpanded={expandedItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
};

interface AccordionItemComponentProps {
  item: AccordionItem;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

const AccordionItemComponent: React.FC<AccordionItemComponentProps> = ({
  item,
  isExpanded,
  onToggle,
  isLast,
}) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.item, !isLast && styles.itemBorder, shadows[1]]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {item.icon && (
          <Ionicons
            name={item.icon}
            size={20}
            color={colorPalette.neutral[700]}
            style={styles.itemIcon}
          />
        )}

        <Text style={styles.title}>{item.title}</Text>

        <Animated.View style={iconStyle}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={colorPalette.neutral[600]}
          />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && <View style={styles.content}>{item.content}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    backgroundColor: colorPalette.neutral[0],
    overflow: "hidden",
  },
  item: {
    backgroundColor: colorPalette.neutral[0],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colorPalette.neutral[200],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    gap: spacing.sm,
  },
  itemIcon: {
    marginRight: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colorPalette.neutral[900],
  },
  content: {
    padding: spacing.base,
    paddingTop: 0,
  },
});
