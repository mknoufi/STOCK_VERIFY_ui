import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  delay?: number;
  style?: ViewStyle;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = '#4F46E5',
  delay = 0,
  style,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.container, style]}
    >
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          {trend && (
            <View style={[
              styles.trendContainer,
              { backgroundColor: trend === 'up' ? '#10B98120' : '#EF444420' }
            ]}>
              <Ionicons
                name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={trend === 'up' ? '#10B981' : '#EF4444'}
              />
              <Text style={[
                styles.trendText,
                { color: trend === 'up' ? '#10B981' : '#EF4444' }
              ]}>
                {trendValue}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
  blur: {
    padding: 16,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
