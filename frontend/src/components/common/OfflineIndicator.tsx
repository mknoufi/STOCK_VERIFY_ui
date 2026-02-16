import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStore } from '../../store/networkStore';
import { Ionicons } from '@expo/vector-icons';

/**
 * A simple indicator that shows when the app is offline.
 */
export const OfflineIndicator: React.FC = () => {
  const { isOnline, isInternetReachable, backendReachability } = useNetworkStore();
  const offline = !isOnline || isInternetReachable === false;
  const degraded = backendReachability === 'YELLOW';

  if (!offline && !degraded) return null;

  const backgroundColor = offline ? '#FF3B30' : '#FF9800';
  const text = offline ? 'Offline Mode' : 'Limited Connectivity';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'center',
    marginVertical: 5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
