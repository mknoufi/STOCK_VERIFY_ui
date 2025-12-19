import React from 'react';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Direct users to the login screen; role-based redirects happen in _layout.
// On web, if already logged in as admin, go directly to admin panel
export default function Index() {
  const { user } = useAuthStore();

  // TEST: Verify this file is being loaded
  React.useEffect(() => {
    console.log('🔵 [TEST] index.tsx is loading...');
    console.log('🔵 [TEST] About to redirect...');
  }, []);

  // On web, if admin/supervisor is logged in, go to admin control panel
  if (Platform.OS === 'web' && user && (user.role === 'admin' || user.role === 'supervisor')) {
    return <Redirect href="/admin/control-panel" />;
  }

  return <Redirect href="/welcome" />;
}
