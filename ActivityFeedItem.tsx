import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface ActivityFeedItemProps {
  title: string;
  subtitle: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
  index: number;
}

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  title,
  subtitle,
  time,
  status,
  index,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'alert-circle';
      case 'error': return 'close-circle';
      default: return 'information-circle';
    }
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
      <BlurView intensity={10} tint="dark" style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
          <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 10,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  time: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
});
