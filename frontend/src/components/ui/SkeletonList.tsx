/**
 * SkeletonList Component
 * Auto-generate skeleton rows for lists
 * Inspired by react-native-auto-skeleton patterns
 */

import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Skeleton, SkeletonListItem, SkeletonCard } from "./Skeleton";
import { FadeIn } from "./FadeIn";
import { modernColors } from "../../styles/modernDesignSystem";

interface SkeletonListProps {
  count?: number;
  variant?: "list" | "card" | "simple";
  rowHeight?: number;
  gap?: number;
  style?: ViewStyle;
  animated?: boolean;
  staggerDelay?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  variant = "list",
  rowHeight = 60,
  gap = 8,
  style,
  animated = true,
  staggerDelay = 50,
}) => {
  const renderItem = (index: number) => {
    const content = (() => {
      switch (variant) {
        case "card":
          return <SkeletonCard />;
        case "simple":
          return (
            <Skeleton
              width="100%"
              height={rowHeight}
              borderRadius={8}
              style={{ marginBottom: gap }}
            />
          );
        case "list":
        default:
          return <SkeletonListItem style={{ marginBottom: gap }} />;
      }
    })();

    if (animated) {
      return (
        <FadeIn key={index} delay={index * staggerDelay} duration={300} direction="up">
          {content}
        </FadeIn>
      );
    }

    return <React.Fragment key={index}>{content}</React.Fragment>;
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => renderItem(index))}
    </View>
  );
};

/**
 * SkeletonGrid - Grid layout for skeleton items
 */
interface SkeletonGridProps {
  columns?: number;
  rows?: number;
  itemSize?: number;
  gap?: number;
  style?: ViewStyle;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  columns = 2,
  rows = 3,
  itemSize = 100,
  gap = 12,
  style,
}) => {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={[styles.gridRow, { gap }]}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <FadeIn
              key={colIndex}
              delay={(rowIndex * columns + colIndex) * 50}
              duration={300}
            >
              <Skeleton
                width={itemSize}
                height={itemSize}
                borderRadius={12}
              />
            </FadeIn>
          ))}
        </View>
      ))}
    </View>
  );
};

/**
 * SkeletonScreen - Full screen skeleton for loading states
 */
interface SkeletonScreenProps {
  header?: boolean;
  tabs?: boolean;
  listCount?: number;
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({
  header = true,
  tabs = false,
  listCount = 5,
}) => {
  return (
    <View style={styles.screen}>
      {header && (
        <FadeIn direction="down" duration={200}>
          <View style={styles.header}>
            <Skeleton width={40} height={40} variant="circular" />
            <Skeleton width="60%" height={24} style={{ marginLeft: 12 }} />
            <Skeleton width={40} height={40} variant="circular" style={{ marginLeft: "auto" }} />
          </View>
        </FadeIn>
      )}

      {tabs && (
        <FadeIn direction="left" delay={100} duration={200}>
          <View style={styles.tabs}>
            {[1, 2, 3].map((_, i) => (
              <Skeleton
                key={i}
                width={80}
                height={32}
                borderRadius={16}
                style={{ marginRight: 8 }}
              />
            ))}
          </View>
        </FadeIn>
      )}

      <SkeletonList count={listCount} variant="list" animated staggerDelay={75} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  grid: {
    flexDirection: "column",
  },
  gridRow: {
    flexDirection: "row",
  },
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: modernColors.background.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 16,
  },
});

export default SkeletonList;
