import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const { user, isLoading, loadStoredAuth } = useAuthStore();

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
          router.replace('/admin/metrics');
        } else if (user.role === 'supervisor' || user.role === 'admin') {
          router.replace('/supervisor/dashboard');
        } else {
          router.replace('/staff/home');
        }
      }, Platform.OS === 'web' ? 200 : 100);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
      <ActivityIndicator color="#00E676" size="large" />
    </View>
  );
}
