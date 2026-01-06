# Performance & Bundle Size Optimization Guide

## 📊 Current Metrics

### Dependencies Audit
```
✅ Minimal Core Dependencies:
- react-native
- expo
- expo-router
- react-native-safe-area-context
- react-native-reanimated (v2)
- zustand (state management)
- axios (HTTP client)

✅ Removed/Avoided:
- Redux (replaced with Zustand - 90% smaller)
- Lodash (native JS used instead)
- Multiple animation libraries (consolidated to reanimated)
```

### Bundle Size Breakdown
```
Core Framework:     ~500 KB (React Native base)
UI Components:      ~150 KB (custom + reusable)
Navigation:         ~100 KB (Expo Router)
State Management:   ~5 KB (Zustand)
HTTP Client:        ~30 KB (Axios)
---
Estimated Total:    ~800-900 KB (uncompressed)
After gzip:         ~250-300 KB (typical)
```

---

## 🚀 Performance Best Practices

### 1. Image & Asset Optimization
```typescript
// ✅ DO: Optimize images before bundling
import { Image } from 'react-native';
<Image
  source={require('../../assets/icon.png')}
  style={{ width: 100, height: 100 }}
  resizeMode="contain" // Important for performance
/>

// ❌ DON'T: Use large unoptimized images
// ❌ DON'T: Load images from untrusted sources
```

### 2. Component Memoization
```typescript
// ✅ DO: Use React.memo for expensive components
import React, { memo } from 'react';

const StatsCard = memo(({ title, value }: Props) => (
  <View>
    <Text>{title}</Text>
    <Text>{value}</Text>
  </View>
));

// ✅ DO: Use useMemo for computed values
const memoizedStyles = useMemo(() =>
  StyleSheet.create({ ... }),
  [theme, isDark]
);

// ✅ DO: Use useCallback for event handlers
const handlePress = useCallback(() => {
  doSomething();
}, [dependency]);
```

### 3. List Rendering Optimization
```typescript
// ✅ DO: Use FlashList for large lists
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id}
  estimatedItemSize={100} // Required for performance
/>

// ✅ DO: Use removeClippedSubviews for scrolling
<ScrollView removeClippedSubviews>
  {/* content */}
</ScrollView>

// ❌ DON'T: Render large lists with map()
// ❌ DON'T: Create inline functions in renderItem
```

### 4. Animation Performance
```typescript
// ✅ DO: Use useSharedValue for animations
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// ✅ DO: Use native drivers when possible
<Animated.View
  style={[animatedStyle]}
  useNativeDriver={true}
/>

// ❌ DON'T: Use Animated from react-native
// ❌ DON'T: Animate layout-dependent properties
```

### 5. Network Optimization
```typescript
// ✅ DO: Implement request caching
const getItemByBarcode = async (barcode: string) => {
  const cached = itemCache.get(barcode);
  if (cached && !isStale(cached)) {
    return cached;
  }
  // Fetch from server
};

// ✅ DO: Use retry logic with backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(1000 * Math.pow(2, i));
    }
  }
};

// ✅ DO: Batch API requests
Promise.all([
  getUser(),
  getSessions(),
  getStats()
]);

// ❌ DON'T: Make sequential API calls
// ❌ DON'T: Fetch large payloads on every render
```

### 6. Memory Management
```typescript
// ✅ DO: Clean up timers and listeners
useEffect(() => {
  const timer = setTimeout(() => { ... }, 1000);
  return () => clearTimeout(timer); // Cleanup
}, []);

// ✅ DO: Unsubscribe from stores
useEffect(() => {
  const unsubscribe = authStore.subscribe(...);
  return () => unsubscribe();
}, []);

// ✅ DO: Clear caches periodically
useEffect(() => {
  const interval = setInterval(() => {
    clearStaleCache();
  }, 5 * 60 * 1000); // Every 5 minutes
  return () => clearInterval(interval);
}, []);

// ❌ DON'T: Create listeners without cleanup
// ❌ DON'T: Keep large objects in state
```

### 7. Code Splitting
```typescript
// ✅ DO: Lazy load route components
import { lazy } from 'react';
import { Suspense } from 'react';

const AdminDashboard = lazy(() => import('./AdminDashboard'));

<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>

// ✅ DO: Split large screens into sub-components
const Dashboard = () => (
  <>
    <Header />
    <StatsSection />
    <ActivitiesSection />
    <FooterSection />
  </>
);
```

---

## ⚡ Rendering Optimization Checklist

### Avoid These Performance Killers
```typescript
// ❌ DON'T: Inline styles in render
<View style={{ backgroundColor: 'red' }} /> // Creates new object each render

// ✅ DO: Use StyleSheet.create()
const styles = StyleSheet.create({
  container: { backgroundColor: 'red' }
});
<View style={styles.container} />

// ❌ DON'T: Inline functions as props
<Button onPress={() => handlePress(item)} /> // New function each render

// ✅ DO: Use useCallback
const handlePress = useCallback((item) => { ... }, []);
<Button onPress={() => handlePress(item)} />

// ❌ DON'T: Conditional rendering in render method
{condition ? <A /> : <B />} // Both components created each render

// ✅ DO: Extract to separate components
const MyComponent = condition ? <A /> : <B />;
```

---

## 🎯 Runtime Performance Targets

### Target Metrics
```
FPS:              60 fps (locked)
TTI (Time to Interactive): < 3 seconds
First Render:     < 2 seconds
List Scroll:      60 fps (smooth)
Animation:        60 fps (smooth)
Memory (idle):    < 100 MB
Memory (active):  < 250 MB
```

### Profiling Tools
```bash
# React Native Profiler
yarn add react-native-performance

# Use Hermes engine (more efficient)
# Set in app.json: "jsEngine": "hermes"

# Monitor with Flipper
npm install flipper-plugin-react-native-performance

# Run performance tests
npm run test:performance
```

---

## 📦 Bundle Analysis

### Check Bundle Size
```bash
# Install bundle analyzer
npm install --save-dev react-native-bundle-visualizer

# Generate report
react-native bundle --platform android --entry-file index.js --dev false --reset-cache --output-file dist/main.jsbundle --bundle-output dist/main.jsbundle.map

# Analyze bundle
react-native-bundle-visualizer dist/main.jsbundle.map
```

### Common Bundle Reduction Techniques
```typescript
// Avoid importing entire lodash library
// ❌ import _ from 'lodash';
// ✅ import debounce from 'lodash/debounce';

// Tree-shake unused code with webpack
// Ensure "sideEffects": false in package.json

// Remove console logs in production
if (__DEV__) {
  console.log('Debug info');
}

// Minify and compress assets
```

---

## 🔄 Caching Strategy

### Multi-Layer Caching
```typescript
// Layer 1: Memory Cache (fastest)
const memoryCache = new Map();

// Layer 2: AsyncStorage (persistent)
import AsyncStorage from '@react-native-async-storage/async-storage';

// Layer 3: Server (source of truth)
const getItem = async (id: string) => {
  // Try memory first
  if (memoryCache.has(id)) return memoryCache.get(id);

  // Try AsyncStorage
  const cached = await AsyncStorage.getItem(`item:${id}`);
  if (cached) {
    memoryCache.set(id, JSON.parse(cached));
    return cached;
  }

  // Fetch from server
  const data = await api.get(`/items/${id}`);
  memoryCache.set(id, data);
  await AsyncStorage.setItem(`item:${id}`, JSON.stringify(data));
  return data;
};
```

---

## 🛡️ Security + Performance

### Secure + Fast Practices
```typescript
// ✅ Cache on client, encrypt sensitive data
const secureCacheItem = async (key: string, data: any) => {
  const encrypted = await encryptData(data);
  await AsyncStorage.setItem(key, encrypted);
};

// ✅ Use HTTPS with keepalive
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  httpAgent: { keepAlive: true },
  httpsAgent: { keepAlive: true }
});

// ✅ Implement request signing
api.interceptors.request.use((config) => {
  config.headers['X-Signature'] = generateSignature(config);
  return config;
});
```

---

## 📋 Pre-Release Checklist

- [ ] Bundle size analyzed and < 500 KB (gzipped)
- [ ] All console.logs removed from production build
- [ ] Hermes engine enabled for better performance
- [ ] ProGuard/R8 enabled for Android
- [ ] Code splitting implemented for large features
- [ ] Images optimized (< 100 KB each)
- [ ] Animations on native driver
- [ ] No memory leaks (useEffect cleanup)
- [ ] Lists using FlashList/FlatList
- [ ] Network requests with retry logic
- [ ] Offline support implemented
- [ ] Performance targets met

---

**Updated:** 2025-12-23
**Framework:** React Native + Expo
**Target Performance:** Production-grade
