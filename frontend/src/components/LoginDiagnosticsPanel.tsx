/**
 * Visual Diagnostics Panel for Login Page
 * Displays step-by-step diagnostic information
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginDiagnostics, DiagnosticStep } from '../utils/loginDiagnostics';
import { useTheme } from '../hooks/useTheme';

interface LoginDiagnosticsPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export const LoginDiagnosticsPanel: React.FC<LoginDiagnosticsPanelProps> = ({
  visible = false,
  onClose,
}) => {
  const theme = useTheme();
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (visible) {
      const updateSteps = () => {
        setSteps(loginDiagnostics.getSteps());
      };

      updateSteps();
      const interval = autoRefresh ? setInterval(updateSteps, 2000) : undefined;

      return () => {
        if (interval) clearInterval(interval);
      };
    }
    return undefined;
  }, [visible, autoRefresh]);

  if (!visible) return null;

  const summary = loginDiagnostics.getSummary();

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pass':
        return { name: 'checkmark-circle' as const, color: '#4CAF50' };
      case 'fail':
        return { name: 'close-circle' as const, color: '#f44336' };
      case 'warn':
        return { name: 'warning' as const, color: '#FFB74D' };
      case 'checking':
        return { name: 'hourglass' as const, color: '#2196F3' };
      default:
        return { name: 'ellipse-outline' as const, color: '#9E9E9E' };
    }
  };

  const webContainerStyle = Platform.OS === 'web' ? styles.containerWeb : undefined;
  const surfaceDark = theme.colors.surfaceDark ?? theme.colors.surface;
  const tertiaryTextColor = theme.colors.textTertiary ?? theme.colors.textSecondary;

  return (
    <View style={[styles.container, webContainerStyle, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="bug" size={24} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Login Page Diagnostics</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={styles.iconButton}>
            <Ionicons
              name={autoRefresh ? 'refresh' : 'refresh-outline'}
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: surfaceDark }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Steps:
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.total}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.summaryValue, { color: '#4CAF50', marginLeft: 4 }]}>
            {summary.passed}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="close-circle" size={16} color="#f44336" />
          <Text style={[styles.summaryValue, { color: '#f44336', marginLeft: 4 }]}>
            {summary.failed}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="warning" size={16} color="#FFB74D" />
          <Text style={[styles.summaryValue, { color: '#FFB74D', marginLeft: 4 }]}>
            {summary.warnings}
          </Text>
        </View>
      </View>

      {/* Steps List */}
      <ScrollView style={styles.stepsContainer}>
        {steps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="information-circle-outline"
              size={48}
              color={theme.colors.placeholder}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No diagnostic steps yet. Run diagnostics to see results.
            </Text>
          </View>
        ) : (
          steps.map((step) => {
            const icon = getStatusIcon(step.status);
            return (
              <View
                key={step.step}
                style={[
                  styles.stepItem,
                  { borderLeftColor: icon.color, backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.stepHeader}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                  <Text style={[styles.stepName, { color: theme.colors.text }]}>
                    [{step.step}] {step.name}
                  </Text>
                  <Text style={[styles.stepStatus, { color: theme.colors.textSecondary }]}>
                    {step.status}
                  </Text>
                </View>
                <Text style={[styles.stepMessage, { color: theme.colors.textSecondary }]}>
                  {step.message}
                </Text>
                {step.details && (
                  <View style={styles.detailsContainer}>
                    <Text style={[styles.detailsText, { color: tertiaryTextColor }]}>
                      {Platform.OS === 'web'
                        ? JSON.stringify(step.details, null, 2)
                        : String(step.details)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.stepTime, { color: tertiaryTextColor }]}>
                  {new Date(step.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  containerWeb: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 1200,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
  },
  summary: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepsContainer: {
    flex: 1,
    padding: 16,
  },
  stepItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  stepStatus: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  stepMessage: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 28,
  },
  detailsContainer: {
    marginTop: 8,
    marginLeft: 28,
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  detailsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
  stepTime: {
    fontSize: 10,
    marginTop: 4,
    marginLeft: 28,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
