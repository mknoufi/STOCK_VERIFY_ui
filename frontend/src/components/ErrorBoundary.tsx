/**
 * Error Boundary Component
 * Catches and handles React component errors
 * Enhanced with theme support and better error handling
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeService } from '../services/themeService';
import { errorReporter } from '../services/errorRecovery';

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
  private theme = ThemeService.getTheme();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };

    // Subscribe to theme changes
    ThemeService.subscribe((theme) => {
      this.theme = theme;
      // Force re-render if there's an error
      if (this.state.hasError) {
        this.forceUpdate();
      }
    });
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
      if (errorReporter && typeof errorReporter.report === 'function') {
        errorReporter.report(error, 'ErrorBoundary', {
          componentStack: errorInfo?.componentStack,
        });
      }
    } catch (reportError) {
      console.error('Error reporting failed:', reportError);
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
          console.error('Fallback render failed:', fallbackError);
          // Continue to default error UI
        }
      }

      // Get current theme (may have changed)
      const currentTheme = ThemeService.getTheme();
      const theme = currentTheme || this.theme;

      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Ionicons name="warning-outline" size={64} color={theme.colors.error} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Something went wrong
            </Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={[styles.details, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
                  Error Details:
                </Text>
                <Text style={[styles.detailsText, { color: theme.colors.textSecondary }]}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={[styles.detailsText, { color: theme.colors.textSecondary }]}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={this.handleReset}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Try Again</Text>
            </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  details: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxHeight: 300,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
