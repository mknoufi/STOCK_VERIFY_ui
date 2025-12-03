/**
 * Quick Actions Component
 * Provides quick access buttons for common operations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  badge?: number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: number;
  compact?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  columns = 4,
  compact = false,
}) => {
  const actionWidth = `${100 / columns}%`;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionButton,
              compact && styles.actionButtonCompact,
              { width: compact ? undefined : actionWidth } as any,
              action.color && { backgroundColor: action.color + '20' },
            ]}
            onPress={action.onPress}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons
                name={action.icon}
                size={compact ? 20 : 24}
                color={action.color || '#2196F3'}
              />
              {action.badge !== undefined && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.actionLabel, compact && styles.actionLabelCompact]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 70,
    position: 'relative',
  },
  actionButtonCompact: {
    padding: 8,
    minWidth: 60,
  },
  actionIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionLabelCompact: {
    fontSize: 10,
  },
});
