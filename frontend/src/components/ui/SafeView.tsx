/**
 * SafeView Component - Safe wrapper with error boundary
 * Prevents crashes by catching errors in children
 */

import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { ErrorBoundary } from "../ErrorBoundary";
import { useTheme } from "../../hooks/useTheme";

interface SafeViewProps {
  children: ReactNode;
  style?: ViewStyle;
  fallback?: (error: Error) => ReactNode;
}

export const SafeView: React.FC<SafeViewProps> = ({
  children,
  style,
  fallback,
}) => {
  const theme = useTheme();

  const defaultFallback = (error: Error) => (
    <View
      style={[
        styles.errorContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
    </View>
  );

  return (
    <ErrorBoundary fallback={fallback || defaultFallback}>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
          style,
        ]}
      >
        {children}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    padding: 16,
  },
});
