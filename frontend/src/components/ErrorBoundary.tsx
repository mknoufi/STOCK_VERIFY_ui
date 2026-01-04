/**
 * Error Boundary Component
 * Catches and handles React component errors
 * Enhanced with modern design system support
 */

import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorReporter } from "../services/errorRecovery";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../styles/modernDesignSystem";
import { PremiumButton } from "./premium/PremiumButton";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: any) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Safely report error
    try {
      if (errorReporter && typeof errorReporter.report === "function") {
        errorReporter.report(error, "ErrorBoundary", {
          componentStack: errorInfo?.componentStack,
        });
      }
    } catch (reportError) {
      console.error("Error reporting failed:", reportError);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        try {
          return this.props.fallback(this.state.error!, this.state.errorInfo);
        } catch (fallbackError) {
          console.error("Fallback render failed:", fallbackError);
          // Continue to default error UI
        }
      }

      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="warning-outline"
                size={80}
                color={modernColors.error.main}
              />
            </View>

            <Text style={styles.title}>Something went wrong</Text>

            <Text style={styles.message}>
              {this.state.error?.message || "An unexpected error occurred"}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.details}>
                <Text style={styles.detailsTitle}>Error Details:</Text>
                <Text style={styles.detailsText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.detailsText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <PremiumButton
                title="Try Again"
                onPress={this.handleReset}
                variant="primary"
                size="medium"
                icon="refresh-outline"
                gradientColors={[...modernColors.gradients.primary]}
              />
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.xl,
  },
  iconContainer: {
    marginBottom: modernSpacing.lg,
    padding: modernSpacing.lg,
    backgroundColor: "rgba(255, 82, 82, 0.1)", // Light red background
    borderRadius: 50,
  },
  title: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
    textAlign: "center",
  },
  message: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginBottom: modernSpacing.xl,
    paddingHorizontal: modernSpacing.md,
  },
  details: {
    width: "100%",
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    marginBottom: modernSpacing.xl,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  detailsTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.sm,
  },
  detailsText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    fontFamily: "monospace",
    marginBottom: modernSpacing.xs,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
});
