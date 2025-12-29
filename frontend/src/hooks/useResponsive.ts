/**
 * useResponsive Hook - Auto-adjusting UI based on screen resolution
 *
 * Provides responsive values that automatically adapt to:
 * - Different iPhone models (SE, Mini, Regular, Plus, Pro Max)
 * - iPad sizes
 * - Different orientations
 * - Dynamic type sizes
 */

import { useMemo } from "react";
import { Dimensions, Platform, PixelRatio, useWindowDimensions } from "react-native";

// Base design dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Device breakpoints
export const BREAKPOINTS = {
  smallPhone: 320, // iPhone SE
  phone: 375, // iPhone Mini
  mediumPhone: 390, // iPhone 14
  largePhone: 430, // iPhone Pro Max
  tablet: 768, // iPad Mini
  largeTablet: 1024, // iPad Pro
  desktop: 1280,
};

export interface ResponsiveConfig {
  // Screen info
  width: number;
  height: number;
  isSmallPhone: boolean;
  isPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;

  // Scale factors
  widthScale: number;
  heightScale: number;
  fontScale: number;

  // Responsive value functions
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  normalize: (size: number) => number;
  spacing: (base: number) => number;
  fontSize: (base: number) => number;

  // Layout helpers
  columns: (phone: number, tablet: number, desktop?: number) => number;
  padding: () => number;
  margin: () => number;
  borderRadius: (base: number) => number;
  iconSize: (base: number) => number;
  buttonHeight: () => number;
  inputHeight: () => number;
  cardPadding: () => number;
  headerHeight: () => number;
}

export function useResponsive(): ResponsiveConfig {
  const { width, height } = useWindowDimensions();
  const _pixelRatio = PixelRatio.get();
  const fontScaleFactor = PixelRatio.getFontScale();

  return useMemo(() => {
    const isLandscape = width > height;
    const isIOS = Platform.OS === "ios";
    const isAndroid = Platform.OS === "android";
    const isWeb = Platform.OS === "web";

    // Device type detection
    const isSmallPhone = width < BREAKPOINTS.phone;
    const isPhone = width >= BREAKPOINTS.phone && width < BREAKPOINTS.tablet;
    const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
    const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
    const isLargeTablet = width >= BREAKPOINTS.largeTablet;

    // Scale factors relative to base design
    const widthScale = width / BASE_WIDTH;
    const heightScale = height / BASE_HEIGHT;
    const avgScale = (widthScale + heightScale) / 2;

    // Clamp scale to prevent extreme sizes
    const clampedScale = Math.min(Math.max(avgScale, 0.8), 1.4);

    // Width percentage
    const wp = (percentage: number): number => {
      return Math.round((width * percentage) / 100);
    };

    // Height percentage
    const hp = (percentage: number): number => {
      return Math.round((height * percentage) / 100);
    };

    // Normalize size based on screen width
    const normalize = (size: number): number => {
      const newSize = size * widthScale;
      if (isIOS) {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
      }
      return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
    };

    // Responsive spacing
    const spacing = (base: number): number => {
      const scaled = base * clampedScale;
      return Math.round(scaled);
    };

    // Responsive font size (respects system font scaling)
    const fontSize = (base: number): number => {
      let size = base * clampedScale;
      
      // Tablet adjustments
      if (isTablet || isLargeTablet) {
        size = base * 1.1; // Slightly larger on tablets
      }
      
      // Small phone adjustments
      if (isSmallPhone) {
        size = base * 0.9; // Slightly smaller on small phones
      }

      // Clamp to reasonable range
      size = Math.min(Math.max(size, base * 0.8), base * 1.3);
      
      return Math.round(size);
    };

    // Responsive columns for grid layouts
    const columns = (phone: number, tablet: number, desktop: number = tablet): number => {
      if (isWeb && width >= BREAKPOINTS.desktop) return desktop;
      if (isTablet || isLargeTablet) return tablet;
      return phone;
    };

    // Responsive padding
    const padding = (): number => {
      if (isSmallPhone) return 12;
      if (isLargePhone || isTablet) return 24;
      if (isLargeTablet) return 32;
      return 16;
    };

    // Responsive margin
    const margin = (): number => {
      if (isSmallPhone) return 8;
      if (isLargePhone || isTablet) return 20;
      if (isLargeTablet) return 28;
      return 12;
    };

    // Responsive border radius
    const borderRadius = (base: number): number => {
      return Math.round(base * clampedScale);
    };

    // Responsive icon size
    const iconSize = (base: number): number => {
      const scaled = base * clampedScale;
      if (isSmallPhone) return Math.round(base * 0.85);
      if (isTablet || isLargeTablet) return Math.round(base * 1.15);
      return Math.round(scaled);
    };

    // Responsive button height
    const buttonHeight = (): number => {
      if (isSmallPhone) return 44;
      if (isTablet || isLargeTablet) return 56;
      return 50;
    };

    // Responsive input height
    const inputHeight = (): number => {
      if (isSmallPhone) return 44;
      if (isTablet || isLargeTablet) return 56;
      return 50;
    };

    // Responsive card padding
    const cardPadding = (): number => {
      if (isSmallPhone) return 12;
      if (isTablet || isLargeTablet) return 24;
      return 16;
    };

    // Responsive header height
    const headerHeight = (): number => {
      if (isSmallPhone) return 52;
      if (isTablet || isLargeTablet) return 64;
      return 56;
    };

    return {
      width,
      height,
      isSmallPhone,
      isPhone,
      isLargePhone,
      isTablet,
      isLargeTablet,
      isLandscape,
      isIOS,
      isAndroid,
      isWeb,
      widthScale,
      heightScale,
      fontScale: fontScaleFactor,
      wp,
      hp,
      normalize,
      spacing,
      fontSize,
      columns,
      padding,
      margin,
      borderRadius,
      iconSize,
      buttonHeight,
      inputHeight,
      cardPadding,
      headerHeight,
    };
  }, [width, height, fontScaleFactor]);
}

// Static responsive helpers for StyleSheet.create (uses initial dimensions)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const staticResponsive = {
  wp: (percentage: number): number => {
    return Math.round((SCREEN_WIDTH * percentage) / 100);
  },
  hp: (percentage: number): number => {
    return Math.round((SCREEN_HEIGHT * percentage) / 100);
  },
  normalize: (size: number): number => {
    const widthScale = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size * widthScale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  },
  isSmallPhone: SCREEN_WIDTH < BREAKPOINTS.phone,
  isTablet: SCREEN_WIDTH >= BREAKPOINTS.tablet,
};

export default useResponsive;
