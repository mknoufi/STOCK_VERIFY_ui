/**
 * ScreenContainer Component - Unified Screen Wrapper v1.0
 *
 * Provides consistent layout across ALL screens in the application.
 * Features:
 * - Aurora/Pattern background (theme-aware)
 * - ScreenHeader with logout, back button, title
 * - Safe area insets
 * - Pull-to-refresh support
 * - Loading state with skeleton/spinner
 * - Keyboard avoiding view
 * - StatusBar configuration
 * - Scroll/Static content modes
 */

import React, { ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuroraBackground, AuroraVariant } from "./AuroraBackground";
import { PatternBackground } from "./PatternBackground";
import { ScreenHeader, ScreenHeaderProps } from "./ScreenHeader";
import { LoadingSpinner } from "./LoadingSpinner";
import { SkeletonScreen } from "./SkeletonList";
import { useThemeContext } from "../../theme/ThemeContext";
import { auroraTheme } from "../../theme/auroraTheme";
import {
  useScreenStyles,
  screenLayoutConstants,
} from "../../styles/screenStyles";

// ============================================================================
// Types
// ============================================================================

export type BackgroundType = "aurora" | "pattern" | "solid" | "gradient";
export type LoadingType = "spinner" | "skeleton" | "none";
export type ContentMode = "scroll" | "static" | "keyboard-scroll";

export interface ScreenContainerProps {
  children: ReactNode;

  // Header configuration
  header?: ScreenHeaderProps | false;

  // Custom header (for screens needing complete control)
  customHeader?: ReactNode;

  // Background configuration
  backgroundType?: BackgroundType;
  auroraVariant?: AuroraVariant;
  /** @deprecated Use auroraVariant instead */
  meshVariant?: AuroraVariant;
  auroraIntensity?: "low" | "medium" | "high";
  withParticles?: boolean;

  // Content configuration
  contentMode?: ContentMode;
  contentStyle?: ViewStyle;
  containerStyle?: ViewStyle;

  // Padding control
  noPadding?: boolean;

  // Loading state
  loading?: boolean;
  loadingType?: LoadingType;
  loadingText?: string;
  skeletonRows?: number;

  // Pull-to-refresh
  refreshing?: boolean;
  onRefresh?: () => void;

  // Safe areas
  edges?: ("top" | "bottom" | "left" | "right")[];
  withBottomPadding?: boolean;

  // Status bar
  statusBarStyle?: "light" | "dark" | "auto";

  // Overlay content (modals, FABs, etc)
  overlay?: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  header,
  customHeader,
  backgroundType = "aurora",
  auroraVariant: auroraVariantProp = "primary",
  meshVariant,
  auroraIntensity = "medium",
  withParticles = false,
  contentMode = "scroll",
  contentStyle,
  containerStyle,
  noPadding = false,
  loading = false,
  loadingType = "spinner",
  loadingText,
  skeletonRows = 5,
  refreshing = false,
  onRefresh,
  edges = ["top", "bottom"],
  withBottomPadding = true,
  statusBarStyle = "light",
  overlay,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, pattern } = useThemeContext();
  const _screenStyles = useScreenStyles();

  // Support meshVariant as deprecated alias for auroraVariant
  const auroraVariant = meshVariant || auroraVariantProp;

  // Calculate safe area padding
  const safeAreaStyle: ViewStyle = {
    paddingTop: edges.includes("top") && header === false ? insets.top : 0,
    paddingBottom:
      edges.includes("bottom") && withBottomPadding ? insets.bottom + 20 : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  // Render background based on type
  const renderBackground = () => {
    switch (backgroundType) {
      case "aurora":
        return (
          <AuroraBackground
            variant={auroraVariant}
            withParticles={withParticles}
            intensity={auroraIntensity}
            animated
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        );
      case "pattern":
        return (
          <>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.colors.background,
              }}
            />
            <PatternBackground
              pattern={pattern}
              color={theme.colors.accent}
              secondaryColor={theme.colors.accentLight}
              opacity={0.04}
            />
          </>
        );
      case "solid":
        return (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.background,
            }}
          />
        );
      case "gradient":
      default:
        return (
          <AuroraBackground
            variant="dark"
            animated={false}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        );
    }
  };

  // Render loading state
  const renderLoading = () => {
    if (!loading) return null;

    if (loadingType === "skeleton") {
      return <SkeletonScreen listCount={skeletonRows} />;
    }

    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner
          size={48}
          color={theme.colors.accent || auroraTheme.colors.primary[500]}
        />
        {loadingText && (
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {loadingText}
          </Text>
        )}
      </View>
    );
  };

  // Render content based on mode
  const renderContent = () => {
    if (loading && loadingType !== "none") {
      return renderLoading();
    }

    const contentContainerStyle: ViewStyle = {
      ...safeAreaStyle,
      paddingHorizontal: noPadding ? 0 : screenLayoutConstants.screenPadding,
      flexGrow: 1,
      ...(contentStyle as object),
    };

    if (contentMode === "static") {
      return (
        <View style={[styles.staticContent, contentContainerStyle]}>
          {children}
        </View>
      );
    }

    const scrollContent = (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={auroraTheme.colors.primary[400]}
              colors={[auroraTheme.colors.primary[500]]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );

    if (contentMode === "keyboard-scroll") {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {scrollContent}
        </KeyboardAvoidingView>
      );
    }

    return scrollContent;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <StatusBar style={statusBarStyle} />
      {renderBackground()}

      {/* Custom Header or Default ScreenHeader */}
      {customHeader
        ? customHeader
        : header !== false && (
            <ScreenHeader
              showBackButton={false}
              showLogoutButton={true}
              showUsername={true}
              {...(header as ScreenHeaderProps)}
            />
          )}

      {/* Content */}
      {renderContent()}

      {/* Overlay content (modals, FABs, speed dials, etc) */}
      {overlay}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default ScreenContainer;
