/**
 * ResponsiveLayout Component - Auto-adjusting container for iOS UI alignment
 *
 * Features:
 * - Automatic padding based on device size
 * - Max width constraints for tablets
 * - Safe area handling
 * - Orientation-aware layouts
 */

import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BREAKPOINTS } from "@/hooks/useResponsive";

interface ResponsiveLayoutProps {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
  maxWidth?: number | "auto";
  centered?: boolean;
  useSafeArea?: boolean;
  padding?: "none" | "small" | "medium" | "large";
  testID?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  style,
  contentStyle,
  scrollable = false,
  maxWidth = 500,
  centered = true,
  useSafeArea = true,
  padding = "medium",
  testID,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isTablet = width >= BREAKPOINTS.tablet;
  const _isLandscape = width > height;

  // Calculate responsive padding
  const getPadding = (): number => {
    const basePadding = {
      none: 0,
      small: 12,
      medium: 16,
      large: 24,
    }[padding];

    // Increase padding on larger screens
    if (isTablet) {
      return basePadding * 1.5;
    }
    if (width >= BREAKPOINTS.largePhone) {
      return basePadding * 1.2;
    }
    if (width < BREAKPOINTS.phone) {
      return basePadding * 0.85;
    }
    return basePadding;
  };

  // Calculate max width for content
  const getMaxWidth = (): number | string => {
    if (maxWidth === "auto") {
      return "100%";
    }
    if (isTablet) {
      return Math.min(maxWidth * 1.3, width - 64);
    }
    return Math.min(maxWidth, width);
  };

  const responsivePadding = getPadding();
  const responsiveMaxWidth = getMaxWidth();

  const containerStyle: ViewStyle = {
    flex: 1,
    paddingTop: useSafeArea ? insets.top : 0,
    paddingBottom: useSafeArea ? insets.bottom : 0,
    paddingLeft: useSafeArea && Platform.OS === "ios" ? insets.left : 0,
    paddingRight: useSafeArea && Platform.OS === "ios" ? insets.right : 0,
  };

  const contentContainerStyle: ViewStyle = {
    paddingHorizontal: responsivePadding,
    paddingVertical: responsivePadding,
    maxWidth: responsiveMaxWidth as number,
    width: "100%",
    alignSelf: centered ? "center" : "flex-start",
    ...(contentStyle || {}),
  };

  if (scrollable) {
    return (
      <View style={[styles.container, containerStyle, style]} testID={testID}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            { flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle, style]} testID={testID}>
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </View>
  );
};

/**
 * ResponsiveRow - Auto-adjusting row for horizontal layouts
 */
interface ResponsiveRowProps {
  children: ReactNode;
  style?: ViewStyle;
  gap?: number;
  wrap?: boolean;
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
  align?: "flex-start" | "center" | "flex-end" | "stretch";
}

export const ResponsiveRow: React.FC<ResponsiveRowProps> = ({
  children,
  style,
  gap = 12,
  wrap = true,
  justify = "flex-start",
  align = "center",
}) => {
  const { width } = useWindowDimensions();

  const responsiveGap = width < BREAKPOINTS.phone ? gap * 0.75 : gap;

  return (
    <View
      style={[
        styles.row,
        {
          gap: responsiveGap,
          flexWrap: wrap ? "wrap" : "nowrap",
          justifyContent: justify,
          alignItems: align,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * ResponsiveGrid - Auto-adjusting grid for card layouts
 */
interface ResponsiveGridProps {
  children: ReactNode;
  style?: ViewStyle;
  minItemWidth?: number;
  gap?: number;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  style,
  minItemWidth = 150,
  gap = 16,
}) => {
  const { width } = useWindowDimensions();

  // Calculate number of columns based on screen width and minimum item width
  const availableWidth = width - 32; // Account for container padding
  const columns = Math.max(1, Math.floor(availableWidth / minItemWidth));
  const itemWidth = (availableWidth - gap * (columns - 1)) / columns;

  const responsiveGap = width < BREAKPOINTS.phone ? gap * 0.75 : gap;

  return (
    <View style={[styles.grid, { gap: responsiveGap }, style]}>
      {React.Children.map(children, (child, index) => (
        <View style={{ width: itemWidth }} key={index}>
          {child}
        </View>
      ))}
    </View>
  );
};

/**
 * ResponsiveText wrapper styles helper
 */
export const getResponsiveTextStyles = (screenWidth: number) => {
  const scale =
    screenWidth < BREAKPOINTS.phone
      ? 0.9
      : screenWidth >= BREAKPOINTS.tablet
        ? 1.15
        : 1;

  return {
    h1: {
      fontSize: Math.round(32 * scale),
      lineHeight: Math.round(40 * scale),
    },
    h2: {
      fontSize: Math.round(24 * scale),
      lineHeight: Math.round(32 * scale),
    },
    h3: {
      fontSize: Math.round(20 * scale),
      lineHeight: Math.round(28 * scale),
    },
    body: {
      fontSize: Math.round(16 * scale),
      lineHeight: Math.round(24 * scale),
    },
    small: {
      fontSize: Math.round(14 * scale),
      lineHeight: Math.round(20 * scale),
    },
    caption: {
      fontSize: Math.round(12 * scale),
      lineHeight: Math.round(16 * scale),
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

export default ResponsiveLayout;
