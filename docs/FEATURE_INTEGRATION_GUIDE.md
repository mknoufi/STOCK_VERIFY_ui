# Feature Integration Guide

## Quick Start: Adding New Features to Your App

This guide walks you through integrating the four new features into your Stock Verification System application.

---

## Feature 1: Error Handling & Notifications

### Frontend Setup

1. **Create Error Recovery Service**
   - Already created in `frontend/src/services/errorRecovery.ts`
   - Provides centralized error reporting

2. **Add Error Notification Component**
   ```typescript
   // In your root component or main screen
   import { ErrorNotification } from '@/components/ErrorNotification';

   export const RootComponent = () => {
     return (
       <>
         {/* Your app content */}
         <ErrorNotification />
       </>
     );
   };
   ```

3. **Wrap API Calls with Error Handling**
   ```typescript
   import { errorReporter } from '@/services/errorRecovery';

   const fetchItems = async () => {
     try {
       const response = await apiClient.get('/api/items');
       return response.data;
     } catch (error) {
       // This will auto-report to users and admins
       errorReporter.report(error, 'ItemService.fetchItems');
       throw error;
     }
   };
   ```

4. **Update Error Messages for Users**
   ```typescript
   // Map technical errors to user-friendly messages
   const errorMessages = {
     'NetworkError': 'Connection lost. Please check your internet.',
     'ValidationError': 'Please check your input and try again.',
     'AuthenticationError': 'Your session expired. Please log in again.',
     'DatabaseError': 'Server error. Please try again later.'
   };
   ```

### Backend Setup

1. **Include Error Reporting API**
   ```python
   # In backend/server.py
   from backend.api.error_reporting_api import router as error_router

   app.include_router(error_router, prefix="/api/admin")
   ```

2. **Enable Admin Error Dashboard**
   ```python
   # Endpoint: GET /api/admin/errors
   # Requires: admin role
   ```

---

## Feature 2: Self-Test Code

### Setup

1. **Add Self-Test to Your App**
   ```typescript
   // In a debug/settings screen
   import { SelfTestUI } from '@/services/selfTestService';

   <Stack.Screen
     name="SelfTest"
     component={SelfTestUI}
     options={{ title: 'System Tests' }}
   />
   ```

2. **Add Menu Item to Dev/Settings**
   ```typescript
   export const DebugMenu = () => {
     const navigation = useNavigation();

     return (
       <View>
         <Button
           title="Run System Tests"
           onPress={() => navigation.navigate('SelfTest')}
         />
       </View>
     );
   };
   ```

3. **Run Tests on App Startup (Optional)**
   ```typescript
   useEffect(() => {
     // Run tests on first startup
     const runDiagnostics = async () => {
       const service = SelfTestService.getInstance();
       const results = await service.runAllTests();

       // Log any failures
       const failures = results.flatMap(s =>
         s.tests.filter(t => t.status === 'fail')
       );

       if (failures.length > 0) {
         errorReporter.report(
           new Error(`${failures.length} tests failed`),
           'AppInitialization'
         );
       }
     };

     runDiagnostics();
   }, []);
   ```

### Testing Each Suite

```typescript
import { SelfTestService } from '@/services/selfTestService';

// Run specific test suite
const service = SelfTestService.getInstance();

// Test authentication
const authTests = await service.testAuthentication();

// Test API connectivity
const apiTests = await service.testAPIConnectivity();
```

---

## Feature 3: PIN Login

### Setup

1. **Add PIN Service to Auth Flow**
   ```typescript
   import { pinAuthService, PINLoginScreen } from '@/services/pinAuth';

   export const AuthFlow = () => {
     const [authMethod, setAuthMethod] = useState('email');

     return (
       <>
         {authMethod === 'email' && (
           <EmailLoginScreen onSuccess={() => handleLogin()} />
         )}
         {authMethod === 'pin' && (
           <PINLoginScreen
             onSuccess={() => handleLogin()}
             onCancel={() => setAuthMethod('email')}
           />
         )}
       </>
     );
   };
   ```

2. **Add PIN Setup in Settings**
   ```typescript
   export const SecuritySettings = () => {
     const [pinEnabled, setPinEnabled] = useState(false);
     const [newPin, setNewPin] = useState('');

     const handleEnablePIN = async () => {
       try {
         await pinAuthService.setPIN(newPin);
         setPinEnabled(true);
         Alert.alert('Success', 'PIN login enabled');
       } catch (error) {
         Alert.alert('Error', error.message);
       }
     };

     return (
       <View>
         <Switch
           value={pinEnabled}
           onValueChange={handleEnablePIN}
         />
         <Text>Enable PIN Login</Text>
       </View>
     );
   };
   ```

3. **Initialize PIN Service on App Start**
   ```typescript
   useEffect(() => {
     const init = async () => {
       await pinAuthService.initialize();
       const enabled = await pinAuthService.isPINEnabled();
       setShowPINLogin(enabled);
     };
     init();
   }, []);
   ```

### PIN Login Flow

```typescript
// Simple login flow with PIN option
export const LoginScreen = () => {
  const [method, setMethod] = useState<'email' | 'pin'>('email');
  const pinEnabled = usePINStatus();

  if (method === 'pin' && pinEnabled) {
    return (
      <PINLoginScreen
        onSuccess={handleLoginSuccess}
        onCancel={() => setMethod('email')}
      />
    );
  }

  return (
    <>
      <EmailLoginForm />
      {pinEnabled && (
        <Button
          title="Use PIN Instead"
          onPress={() => setMethod('pin')}
        />
      )}
    </>
  );
};
```

---

## Feature 4: WiFi Monitoring

### Setup

1. **Install Dependency**
   ```bash
   npm install @react-native-community/netinfo
   ```

2. **Add WiFi Status to App**
   ```typescript
   import { useWiFiStatus, WiFiStatusIndicator } from '@/services/wifiConnectionService';

   export const App = () => {
     const { isOnline } = useWiFiStatus();

     return (
       <>
         {!isOnline && <OfflineIndicator />}
         <AppNavigator />
       </>
     );
   };
   ```

3. **Display WiFi Connection Indicator**
   ```typescript
   export const WiFiIndicator = () => {
     const { isOnline, isWiFi, ssid } = useWiFiStatus();

     if (!isOnline) {
       return (
         <View style={styles.offlineBar}>
           <Text style={styles.offlineText}>📡 No Connection</Text>
         </View>
       );
     }

     return (
       <View style={styles.onlineBar}>
         <Text style={styles.onlineText}>
           {isWiFi ? `📶 WiFi: ${ssid}` : '📱 Cellular'}
         </Text>
       </View>
     );
   };
   ```

4. **Handle Offline Scenarios**
   ```typescript
   const { isOnline } = useWiFiStatus();

   const handleSync = async () => {
     if (!isOnline) {
       Alert.alert(
         'No Connection',
         'Please connect to WiFi or cellular to sync data.'
       );
       return;
     }

     // Proceed with sync
     await performSync();
   };
   ```

---

## Complete Integration Example

Here's a complete app setup with all four features:

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Services
import { ErrorReporter } from '@/services/errorRecovery';
import { pinAuthService } from '@/services/pinAuth';
import { WiFiConnectionService } from '@/services/wifiConnectionService';

// Components
import ErrorNotification from '@/components/ErrorNotification';
import WiFiIndicator from '@/components/WiFiIndicator';
import { AuthNavigator, HomeNavigator } from '@/navigation';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize all services
    const initServices = async () => {
      // 1. Initialize error reporting
      ErrorReporter.getInstance().initialize();

      // 2. Initialize PIN auth
      await pinAuthService.initialize();

      // 3. Initialize WiFi monitoring
      const wifiService = WiFiConnectionService.getInstance();
      await wifiService.initialize();

      // 4. Run self-tests (optional)
      // const service = SelfTestService.getInstance();
      // const results = await service.runAllTests();
    };

    initServices();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeNavigator}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Global Components */}
      <ErrorNotification />
      <WiFiIndicator />
    </SafeAreaView>
  );
}
```

---

## API Integration

### Error Reporting Endpoints

```typescript
// Report an error
POST /api/admin/errors/report
{
  "type": "NetworkError",
  "message": "Failed to load items",
  "severity": "high",
  "context": {
    "endpoint": "/api/items",
    "method": "GET"
  }
}

// Get errors (admin only)
GET /api/admin/errors?severity=high&limit=20

// Get dashboard (admin only)
GET /api/admin/errors/dashboard

// Update error status (admin only)
PATCH /api/admin/errors/{error_id}/status?status=acknowledged
```

---

## Testing Checklist

- [ ] Error notifications appear when network fails
- [ ] PIN can be set in settings
- [ ] PIN login works with correct PIN
- [ ] PIN login fails with incorrect PIN
- [ ] Account locks after 5 failed PIN attempts
- [ ] WiFi disconnection notification appears
- [ ] WiFi reconnection notification appears
- [ ] Self-tests complete successfully
- [ ] Admin error dashboard shows reported errors
- [ ] Error status can be updated by admins

---

## Troubleshooting

### Errors Not Appearing in UI
1. Check that `ErrorNotification` component is mounted in root
2. Verify error reporter is initialized
3. Check notification permissions in app settings

### PIN Login Not Working
1. Verify PIN format is exactly 4 digits
2. Check that secure storage is available
3. Check app permissions for secure storage

### WiFi Notifications Not Showing
1. Check notification permissions are granted
2. Verify NetInfo dependency is installed
3. Check that WiFi service is initialized

### Self-Tests Failing
1. Run tests in settings
2. Check which test is failing
3. Verify backend is running and accessible
4. Check internet connection

---

## Next Steps

1. **Deploy to Production**
   - Test all features on real devices
   - Update environment variables
   - Enable error reporting to backend

2. **Monitor Errors**
   - Set up admin dashboard
   - Create notification system for critical errors
   - Implement automatic error remediation

3. **Optimize Performance**
   - Monitor battery impact of WiFi monitoring
   - Tune self-test execution time
   - Optimize error storage

4. **Enhance Security**
   - Implement PIN expiration
   - Add biometric authentication
   - Implement error encryption

---

## Support

For questions or issues:
1. Check the service initialization logs
2. Review error dashboard for recent errors
3. Run self-tests to identify issues
4. Contact development team with error IDs
