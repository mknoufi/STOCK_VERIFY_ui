/**
 * Tabs Component
 * Navigation tabs with smooth animations
 * Phase 2: Design System - Core Components
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
} from "@/theme/designTokens";

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: "default" | "pills" | "underline";
  scrollable?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = "default",
  scrollable = false,
}) => {
  const [tabLayouts, setTabLayouts] = useState<{
    [key: string]: { x: number; width: number };
  }>({});
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  React.useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (layout) {
      indicatorPosition.value = withSpring(layout.x, {
        damping: 15,
        stiffness: 150,
      });
      indicatorWidth.value = withSpring(layout.width, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [activeTab, tabLayouts, indicatorPosition, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: indicatorWidth.value,
  }));

  const handleTabLayout = (key: string, x: number, width: number) => {
    setTabLayouts((prev) => ({
      ...prev,
      [key]: { x, width },
    }));
  };

  const renderTab = (tab: Tab, _index: number) => {
    const isActive = tab.key === activeTab;

    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onTabChange(tab.key)}
        onLayout={(e) => {
          const { x, width } = e.nativeEvent.layout;
          handleTabLayout(tab.key, x, width);
        }}
        style={[
          styles.tab,
          variant === "pills" && styles.tabPill,
          variant === "pills" && isActive && styles.tabPillActive,
          !scrollable && styles.tabFlex,
        ]}
        activeOpacity={0.7}
      >
        {tab.icon && <View style={styles.tabIcon}>{tab.icon}</View>}

        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
            variant === "pills" && isActive && styles.tabLabelPillActive,
          ]}
        >
          {tab.label}
        </Text>

        {tab.badge !== undefined && tab.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {tab.badge > 99 ? "99+" : tab.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      contentContainerStyle: styles.scrollContent,
    }
    : { style: styles.container };

  return (
    <View style={styles.wrapper}>
      <Container {...containerProps}>
        {tabs.map((tab, _index) => renderTab(tab, _index))}
      </Container>

      {/* Indicator */}
      {variant === "underline" && (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  container: {
    flexDirection: "row",
    backgroundColor: colorPalette.neutral[0],
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabFlex: {
    flex: 1,
    justifyContent: "center",
  },
  tabPill: {
    borderRadius: borderRadius.full,
    backgroundColor: colorPalette.neutral[100],
  },
  tabPillActive: {
    backgroundColor: colorPalette.primary[500],
  },
  tabIcon: {
    marginRight: spacing.xs,
  },
  tabLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colorPalette.neutral[600],
  },
  tabLabelActive: {
    color: colorPalette.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  tabLabelPillActive: {
    color: colorPalette.neutral[0],
  },
  badge: {
    backgroundColor: colorPalette.error[500],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colorPalette.neutral[0],
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: colorPalette.primary[500],
    borderRadius: borderRadius.sm,
  },
});
