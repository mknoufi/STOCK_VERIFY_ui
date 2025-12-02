# Comprehensive Implementation Guide: Stock Verify App Upgrade

This document provides a detailed, step-by-step guide to implementing advanced features and architectural improvements for the Stock Verify application. All methods described here use verified, standard practices for React Native and Expo.

---

## 📋 Table of Contents

1. [Phase 1: Foundation & Utilities](#phase-1-foundation--utilities)
   - React Query Integration
   - Style Extraction
   - Utility Integration
2. [Phase 2: Component Architecture](#phase-2-component-architecture)
   - Component Splitting Strategy
   - State Consolidation
   - Error Boundaries
3. [Phase 3: UX Enhancements](#phase-3-ux-enhancements)
   - Haptic Feedback
   - Animations
   - Loading Skeletons
4. [Phase 4: Advanced Features](#phase-4-advanced-features)
   - Offline Queue & Background Sync
   - Analytics & Error Tracking

---

## Phase 1: Foundation & Utilities

### 1.1 React Query Integration
**Objective**: Replace ad-hoc `AsyncStorage` calls with a robust caching layer to improve performance and reduce boilerplate.

**Prerequisites**:
```bash
npm install @tanstack/react-query
```

**Implementation**:

1.  **Create the Query Client** (`frontend/services/queryClient.ts`):
    ```typescript
    import { QueryClient } from '@tanstack/react-query';

    export const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
          gcTime: 1000 * 60 * 30,   // Cache is kept for 30 minutes
          retry: 2,
        },
      },
    });
    ```

2.  **Wrap the App** (`frontend/app/_layout.tsx`):
    ```typescript
    import { QueryClientProvider } from '@tanstack/react-query';
    import { queryClient } from '../services/queryClient';

    export default function RootLayout() {
      return (
        <QueryClientProvider client={queryClient}>
          {/* Existing App Content */}
        </QueryClientProvider>
      );
    }
    ```

3.  **Create Custom Hooks** (`frontend/hooks/useSession.ts`):
    ```typescript
    import { useQuery, useMutation } from '@tanstack/react-query';
    import { getSession, updateSession } from '../services/api';

    export const useSession = (sessionId: string) => {
      return useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => getSession(sessionId),
        enabled: !!sessionId,
      });
    };
    ```

### 1.2 Style Extraction
**Objective**: Move styles out of component files to improve readability and maintainability.

**Implementation**:

1.  **Create Style File** (`frontend/styles/screens/ScanScreen.styles.ts`):
    ```typescript
    import { StyleSheet, Platform } from 'react-native';
    import { colors, spacing, typography } from '../globalStyles';

    export const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: colors.surface,
      },
      // ... copy all styles from scan.tsx
    });
    ```

2.  **Import in Component**:
    ```typescript
    import { styles } from '@/styles/screens/ScanScreen.styles';
    ```

---

## Phase 2: Component Architecture

### 2.1 Component Splitting Strategy
**Objective**: Break down the 4,000+ line `ScanScreen` into manageable chunks.

**Recommended Structure**:
```
frontend/components/scan/
├── ScanHeader.tsx
├── ItemDetailsCard.tsx
├── BarcodeInput.tsx
├── SerialNumberSection.tsx
├── DamageSection.tsx
└── ScannerModal.tsx
```

**Example: `ScanHeader.tsx`**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '@/styles/screens/ScanScreen.styles';

interface ScanHeaderProps {
  onBack: () => void;
  onLogout: () => void;
  username?: string;
}

export const ScanHeader: React.FC<ScanHeaderProps> = ({ onBack, onLogout, username }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>Scan Items</Text>
      {username && <Text style={styles.headerSubtitle}>{username}</Text>}
    </View>
    <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
      <Ionicons name="log-out-outline" size={24} color="#fff" />
    </TouchableOpacity>
  </View>
);
```

### 2.2 State Consolidation
**Objective**: Reduce the number of `useState` calls by grouping related state.

**Implementation**:

1.  **Define State Interface**:
    ```typescript
    interface ScanState {
      // Scanner Config
      showScanner: boolean;
      manualBarcode: string;
      
      // Item Data
      currentItem: Item | null;
      countedQty: string;
      damageQty: string;
      
      // Workflow
      autoIncrement: boolean;
      serialCapture: boolean;
    }
    ```

2.  **Create Custom Hook** (`frontend/hooks/useScanState.ts`):
    ```typescript
    import { useState, useCallback } from 'react';

    export const useScanState = () => {
      const [state, setState] = useState<ScanState>(initialState);

      const updateState = useCallback((updates: Partial<ScanState>) => {
        setState(prev => ({ ...prev, ...updates }));
      }, []);

      const resetForm = useCallback(() => {
        setState(prev => ({
          ...prev,
          currentItem: null,
          countedQty: '',
          // ... reset other fields
        }));
      }, []);

      return { state, updateState, resetForm };
    };
    ```

### 2.3 Error Boundaries
**Objective**: Prevent the entire app from crashing due to a component error.

**Implementation**:

1.  **Create Component** (`frontend/components/ErrorBoundary.tsx`):
    ```typescript
    import React from 'react';
    import { View, Text, Button, StyleSheet } from 'react-native';

    interface Props { children: React.ReactNode }
    interface State { hasError: boolean }

    export class ErrorBoundary extends React.Component<Props, State> {
      state = { hasError: false };

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to error reporting service
        console.error(error, info);
      }

      render() {
        if (this.state.hasError) {
          return (
            <View style={styles.container}>
              <Text style={styles.text}>Something went wrong.</Text>
              <Button title="Retry" onPress={() => this.setState({ hasError: false })} />
            </View>
          );
        }
        return this.props.children;
      }
    }
    ```

---

## Phase 3: UX Enhancements

### 3.1 Haptic Feedback
**Objective**: Provide tactile feedback for interactions.

**Prerequisites**:
```bash
npx expo install expo-haptics
```

**Implementation**:
```typescript
import * as Haptics from 'expo-haptics';

// Success
const handleSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Error
const handleError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

// Selection
const handlePress = () => {
  Haptics.selectionAsync();
};
```

### 3.2 Loading Skeletons
**Objective**: Improve perceived performance during data fetching.

**Implementation**:
```typescript
import { View, Animated } from 'react-native';

const SkeletonItem = () => {
  const opacity = new Animated.Value(0.3);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.skeletonBox, { opacity }]} />
  );
};
```

---

## Phase 4: Advanced Features

### 4.1 Offline Queue & Background Sync
**Objective**: Ensure data integrity when network is unstable.

**Prerequisites**:
```bash
npm install @react-native-community/netinfo
npx expo install expo-background-fetch expo-task-manager
```

**Implementation**:

1.  **Queue Manager** (`frontend/services/queueManager.ts`):
    ```typescript
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import NetInfo from '@react-native-community/netinfo';

    const QUEUE_KEY = 'offline_mutation_queue';

    export const addToQueue = async (mutation: any) => {
      const currentQueue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || '[]');
      currentQueue.push(mutation);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
    };

    export const processQueue = async () => {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;

      const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      // Process items...
      
      await AsyncStorage.setItem(QUEUE_KEY, '[]');
    };
    ```

### 4.2 Analytics & Error Tracking
**Objective**: Monitor app health and usage in production.

**Prerequisites**:
```bash
npx expo install sentry-expo
```

**Implementation**:

1.  **Initialize Sentry** (`frontend/app/_layout.tsx`):
    ```typescript
    import * as Sentry from 'sentry-expo';

    Sentry.init({
      dsn: 'YOUR_SENTRY_DSN',
      enableInExpoDevelopment: true,
      debug: true,
    });
    ```

2.  **Track Errors**:
    ```typescript
    try {
      // risky code
    } catch (error) {
      Sentry.Native.captureException(error);
    }
    ```

---

## Verification Checklist

Before deploying any changes, verify the following:

- [ ] **Type Safety**: Run `tsc --noEmit` to ensure no TypeScript errors.
- [ ] **Linting**: Run `eslint` to catch code style issues.
- [ ] **Performance**: Use React DevTools Profiler to check for unnecessary re-renders.
- [ ] **Offline Mode**: Test the app with Airplane Mode enabled.
- [ ] **Memory**: Monitor memory usage in Xcode/Android Studio to ensure no leaks.
