import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    // Ensure auth state is loaded
    (async () => {
      try {
        await loadStoredAuth();
      } catch {
        // ignore; user can login manually
      }

      // Small delay to avoid redirect loops
      setTimeout(() => {
        if (!user) {
          router.replace('/welcome');
          return;
        }
        if (Platform.OS === 'web' && (user.role === 'supervisor' || user.role === 'admin')) {
          router.replace('/admin/metrics' as any);
        } else if (user.role === 'supervisor' || user.role === 'admin') {
          router.replace('/supervisor/dashboard' as any);
        } else {
          router.replace('/staff/home' as any);
        }
      }, Platform.OS === 'web' ? 200 : 100);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Ionicons name="cube-outline" size={48} color="#3B82F6" />
      </View>
      <Text style={styles.title}>Stock Verify</Text>
      <ActivityIndicator color="#3B82F6" size="large" style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
