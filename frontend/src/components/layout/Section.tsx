/**
 * Section Component - Content grouping with consistent spacing
 * Provides title, subtitle, and optional action button
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, layout } from '../../styles/globalStyles';

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  };
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  subtitle,
  action,
  style,
  contentStyle,
  testID,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {(title || subtitle || action) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && (
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon && (
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={theme.colors.primary}
                  style={styles.actionIcon}
                />
              )}
              <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: layout.sectionGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionLabel: {
    ...typography.button,
    fontSize: 14,
  },
  content: {
    // Content spacing handled by children
  },
});
