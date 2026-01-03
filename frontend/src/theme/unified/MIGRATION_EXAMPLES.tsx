/**
 * Unified Design System - Migration Guide & Examples
 *
 * This file demonstrates the new patterns and how to migrate from old code.
 *
 * Key Benefits:
 * - Single source of truth for all design tokens
 * - Type-safe theme values
 * - Consistent animations across the app
 * - Better accessibility with proper touch targets
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

// ==========================================
// IMPORTS - NEW WAY
// ==========================================
import {
  // Colors
  colors,
  semanticColors,
  gradients as _gradients,

  // Spacing
  spacing,
  layout,
  touchTargets,

  // Radius
  radius,
  componentRadius,

  // Typography
  fontSize as _fontSize,
  fontWeight as _fontWeight,
  textStyles,

  // Shadows
  shadows,
  coloredShadows as _coloredShadows,

  // Animations
  duration as _duration,
  easing as _easing,
  animationPresets as _animationPresets,
  springConfigs as _springConfigs,
  opacity as _opacity,
  zIndex as _zIndex,
} from './index';

import {
  TouchableFeedback,
  TouchableScale,
  UnifiedAnimatedCard,
} from '../../components/ui';

import {
  useStaggeredEntry,
} from '../../hooks';

// ==========================================
// EXAMPLE 1: Color Migration
// ==========================================

// ❌ OLD WAY - Hardcoded colors
const _oldCardStyle = {
  backgroundColor: '#F8FAFC',        // Magic color
  borderColor: '#E2E8F0',            // What is this?
};

const _oldTextStyle = {
  color: '#0EA5E9',                  // Primary? Info? Who knows!
};

// ✅ NEW WAY - Semantic tokens
const _newCardStyle = {
  backgroundColor: semanticColors.background.secondary,
  borderColor: semanticColors.border.default,
};

const _newTextStyle = {
  color: colors.primary[400],        // Clear: primary blue, shade 400
};

// ==========================================
// EXAMPLE 2: Spacing Migration
// ==========================================

// ❌ OLD WAY - Magic numbers
const _oldContainerStyle = {
  padding: 16,
  marginBottom: 24,
  gap: 8,
};

// ✅ NEW WAY - Semantic spacing
const _newContainerStyle = {
  padding: spacing.lg,              // 16px
  marginBottom: spacing['2xl'],     // 24px
  gap: spacing.sm,                  // 8px
};

// ==========================================
// EXAMPLE 3: Border Radius Migration
// ==========================================

// ❌ OLD WAY - Inconsistent values
const _oldButtonStyle = {
  borderRadius: 14,                  // Why 14?
};

const _oldModalStyle = {
  borderRadius: 20,                  // Different from button?
};

// ✅ NEW WAY - Consistent scale
const _newButtonStyle = {
  borderRadius: componentRadius.button,  // 8px (consistent)
};

const _newModalStyle = {
  borderRadius: componentRadius.modal,   // 16px (consistent)
};

// ==========================================
// EXAMPLE 4: Shadow Migration
// ==========================================

// ❌ OLD WAY - Copy-paste shadows
const _oldShadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
};

// ✅ NEW WAY - Preset shadows
const _newShadowStyle = {
  ...shadows.md,                     // Complete shadow config
};

// ==========================================
// EXAMPLE 5: Touch Target Accessibility
// ==========================================

// ❌ OLD WAY - Too small touch targets
const _OldIconButton: React.FC = () => (
  <View style={{ width: 36, height: 36 }}>  {/* Too small! */}
    <Text>×</Text>
  </View>
);

// ✅ NEW WAY - Accessible touch targets
const NewIconButton: React.FC = () => (
  <TouchableFeedback
    style={{
      width: touchTargets.minimum,    // 44px minimum
      height: touchTargets.minimum,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    hitSlopSize="medium"              // Extends touch area
  >
    <Text>×</Text>
  </TouchableFeedback>
);

// ==========================================
// EXAMPLE 6: Animated List Items
// ==========================================

interface ListItemProps {
  item: { id: string; title: string };
  index: number;
}

// ❌ OLD WAY - No animations
const _OldListItem: React.FC<ListItemProps> = ({ item }) => (
  <View style={staticStyles.card}>
    <Text>{item.title}</Text>
  </View>
);

// ✅ NEW WAY - Staggered entry animation
const NewListItem: React.FC<ListItemProps> = ({ item, index }) => {
  // useStaggeredEntry provides animation - animatedStyle used internally by UnifiedAnimatedCard
  useStaggeredEntry({ index });

  return (
    <UnifiedAnimatedCard
      variant="elevated"
      staggerIndex={index}
      onPress={() => console.log('Pressed', item.id)}
    >
      <Text style={{ ...textStyles.body, color: semanticColors.text.primary }}>
        {item.title}
      </Text>
    </UnifiedAnimatedCard>
  );
};

// ==========================================
// EXAMPLE 7: Press Feedback
// ==========================================

// ❌ OLD WAY - No feedback
const _OldButton: React.FC = () => (
  <View style={staticStyles.button}>
    <Text>Press Me</Text>
  </View>
);

// ✅ NEW WAY - Platform-specific feedback
const NewButton: React.FC = () => (
  <TouchableScale
    onPress={() => console.log('Pressed!')}
    style={[
      staticStyles.button,
      { borderRadius: componentRadius.button }
    ]}
  >
    <Text style={{ ...textStyles.button, color: semanticColors.text.inverse }}>
      Press Me
    </Text>
  </TouchableScale>
);

// ==========================================
// EXAMPLE 8: Complete Card Component
// ==========================================

interface StatsData {
  id: string;
  title: string;
  value: number;
  trend: 'up' | 'down';
}

const CompleteDashboard: React.FC<{ stats: StatsData[] }> = ({ stats }) => {
  return (
    <View style={staticStyles.dashboard}>
      <FlatList
        data={stats}
        numColumns={2}
        contentContainerStyle={{ padding: layout.screenPadding }}
        columnWrapperStyle={{ gap: layout.itemGap }}
        ItemSeparatorComponent={() => <View style={{ height: layout.itemGap }} />}
        renderItem={({ item, index }) => (
          <UnifiedAnimatedCard
            variant="elevated"
            staggerIndex={index}
            style={staticStyles.statsCard}
            onPress={() => console.log('View details:', item.id)}
          >
            <Text style={staticStyles.statsTitle}>{item.title}</Text>
            <Text style={staticStyles.statsValue}>{item.value}</Text>
            <Text
              style={[
                staticStyles.statsTrend,
                { color: item.trend === 'up' ? colors.success[500] : colors.error[500] }
              ]}
            >
              {item.trend === 'up' ? '↑' : '↓'}
            </Text>
          </UnifiedAnimatedCard>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

// ==========================================
// QUICK REFERENCE: Token Mappings
// ==========================================

/**
 * COLOR REPLACEMENTS:
 * '#0EA5E9' → colors.primary[400]
 * '#F8FAFC' → semanticColors.background.secondary
 * '#0F172A' → colors.neutral[900]
 * '#64748B' → colors.neutral[500]
 * '#22C55E' → colors.success[500]
 * '#EF4444' → colors.error[500]
 *
 * SPACING REPLACEMENTS:
 * 4 → spacing.xs
 * 8 → spacing.sm
 * 12 → spacing.md
 * 16 → spacing.lg
 * 20 → spacing.xl
 * 24 → spacing['2xl']
 * 32 → spacing['3xl']
 *
 * RADIUS REPLACEMENTS:
 * 8 → radius.sm
 * 12 → radius.md
 * 16 → radius.lg
 * 20 → radius.xl
 * 9999 → radius.full
 *
 * TYPOGRAPHY REPLACEMENTS:
 * fontSize: 12 → fontSize.sm
 * fontSize: 14 → fontSize.md
 * fontSize: 16 → fontSize.lg
 * fontSize: 18 → fontSize.xl
 * fontWeight: '600' → fontWeight.semiBold
 */

// ==========================================
// STYLES
// ==========================================
const staticStyles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors.background.elevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: componentRadius.button,
    minHeight: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboard: {
    flex: 1,
    backgroundColor: semanticColors.background.primary,
  },
  statsCard: {
    flex: 1,
    minHeight: 120,
  },
  statsTitle: {
    ...textStyles.caption,
    color: semanticColors.text.secondary,
    marginBottom: spacing.xs,
  },
  statsValue: {
    ...textStyles.h2,
    color: semanticColors.text.primary,
  },
  statsTrend: {
    ...textStyles.bodySmall,
    marginTop: spacing.xs,
  },
});

export {
  CompleteDashboard,
  NewListItem,
  NewButton,
  NewIconButton,
};
