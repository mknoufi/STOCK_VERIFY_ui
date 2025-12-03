/**
 * EmptyState Component - Empty state placeholder
 * Safe, non-breaking addition for empty states
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '../Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={64} color={theme.colors.textSecondary} style={styles.icon} />
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 300,
  },
  actionButton: {
    width: '100%',
  },
});
