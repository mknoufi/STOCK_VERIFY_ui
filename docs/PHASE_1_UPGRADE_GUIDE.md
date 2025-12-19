# Phase 1: Foundation & Dependencies Upgrade Guide

## Overview

This guide covers upgrading the core dependencies and establishing a solid foundation for future development.

## Pre-Upgrade Checklist

- [ ] Create backup of current codebase
- [ ] Commit all pending changes
- [ ] Create feature branch: `git checkout -b upgrade/phase-1-dependencies`
- [ ] Run full test suite to establish baseline
- [ ] Document current versions

## Current Versions

```json
{
  "react-native": "0.81.5",
  "expo": "~54.0.25",
  "expo-router": "~6.0.15",
  "@tanstack/react-query": "^5.59.16",
  "zustand": "^5.0.2",
  "react-native-reanimated": "~4.1.1"
}
```

## Upgrade Strategy

### Phase 1.1: React Native Upgrade (Week 2)

#### Step 1: Prepare for Upgrade

```bash
# Install React Native Upgrade Helper
npm install -g react-native-upgrade-helper

# Check what will change
npx react-native upgrade --help
```

#### Step 2: Update package.json

```json
{
  "dependencies": {
    "react-native": "0.82.1",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

#### Step 3: Update Native Dependencies

```bash
cd frontend
npm install

# Clear caches
npm start -- --reset-cache

# Rebuild
npm run android  # or npm run ios
```

#### Step 4: Fix Breaking Changes

**Known Breaking Changes in 0.82.1:**

1. **New Architecture Changes**
   - Already enabled in `app.json`: `"newArchEnabled": true`
   - Verify Fabric compatibility of all native modules

2. **Metro Bundler Updates**
   ```js
   // metro.config.js - Update if needed
   const { getDefaultConfig } = require('expo/metro-config');

   module.exports = getDefaultConfig(__dirname);
   ```

3. **TypeScript Updates**
   - Update type definitions
   - Fix any new type errors

### Phase 1.2: Expo Router Upgrade (Week 2-3)

#### Step 1: Update Expo Router

```bash
npm install expo-router@latest
```

#### Step 2: Migration Steps

**File-based Routing Changes:**

```
app/
  _layout.tsx          # Root layout
  (tabs)/              # Tab group
    _layout.tsx        # Tab layout
    index.tsx          # Home tab
    scan.tsx           # Scan tab
  (auth)/              # Auth group
    login.tsx
    register.tsx
  +not-found.tsx       # 404 page (new in v7)
```

**Update Navigation Hooks:**

```tsx
// Before (v6)
import { useRouter, useSearchParams } from 'expo-router';

// After (v7) - Same, but with enhanced types
import { useRouter, useLocalSearchParams } from 'expo-router';
```

#### Step 3: Update Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "stockverify",
    "web": {
      "bundler": "metro"
    }
  }
}
```

### Phase 1.3: Critical Dependency Updates (Week 3)

#### TanStack Query

```bash
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest
```

**Migration Notes:**
- Check for deprecated options
- Update query keys to use arrays consistently
- Verify cache persistence setup

#### Zustand

```bash
npm install zustand@latest
```

**Migration Notes:**
- No breaking changes expected
- Verify middleware compatibility

#### React Native Reanimated

```bash
npm install react-native-reanimated@latest
```

**Migration Notes:**
- Update Babel config if needed
- Test all animations
- Verify worklets compatibility

### Phase 1.4: TypeScript Configuration (Week 3-4)

#### Update tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

### Phase 1.5: Testing Infrastructure (Week 4)

#### Install Testing Dependencies

```bash
npm install --save-dev \
  @testing-library/react-native@latest \
  @testing-library/jest-native@latest \
  @testing-library/react-hooks@latest \
  jest-expo@latest
```

#### Configure Jest

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

#### Create Test Setup

```js
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));
```

## Testing Strategy

### 1. Unit Tests

```tsx
// Example: __tests__/components/Badge.test.tsx
import { render } from '@testing-library/react-native';
import { Badge } from '@/components/ui';

describe('Badge', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Badge label="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('applies variant styles', () => {
    const { getByText } = render(
      <Badge label="Error" variant="error" />
    );
    const badge = getByText('Error').parent;
    expect(badge).toHaveStyle({ backgroundColor: expect.any(String) });
  });
});
```

### 2. Integration Tests

```tsx
// Example: __tests__/screens/Scan.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ScanScreen from '@/app/staff/scan';

describe('ScanScreen', () => {
  it('handles barcode scan', async () => {
    const { getByTestId } = render(<ScanScreen />);

    const scanButton = getByTestId('scan-button');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByTestId('scan-result')).toBeTruthy();
    });
  });
});
```

### 3. E2E Tests (Optional)

```bash
# Install Detox
npm install --save-dev detox

# Or use Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Verification Steps

### After Each Upgrade

1. **Build Verification**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

2. **Runtime Testing**
   - Test on iOS simulator
   - Test on Android emulator
   - Test on physical device

3. **Performance Check**
   - Measure app launch time
   - Check bundle size
   - Profile animations

### Rollback Plan

If issues occur:

```bash
# Revert package.json changes
git checkout package.json package-lock.json

# Reinstall dependencies
rm -rf node_modules
npm install

# Clear caches
npm start -- --reset-cache
```

## Common Issues & Solutions

### Issue 1: Metro Bundler Errors

**Solution:**
```bash
# Clear all caches
rm -rf node_modules
npm install
watchman watch-del-all
npm start -- --reset-cache
```

### Issue 2: Type Errors After Upgrade

**Solution:**
```bash
# Update type definitions
npm install --save-dev @types/react@latest @types/react-native@latest

# Run type check
npm run typecheck
```

### Issue 3: Native Module Compatibility

**Solution:**
- Check module's GitHub for React Native 0.82 compatibility
- Look for alternative packages
- Consider using patch-package for temporary fixes

## Post-Upgrade Tasks

- [ ] Update documentation
- [ ] Update CI/CD pipelines
- [ ] Notify team of changes
- [ ] Create migration guide for team
- [ ] Update README with new requirements

## Timeline

- **Week 2**: React Native upgrade + testing
- **Week 3**: Expo Router + dependencies
- **Week 4**: TypeScript + testing infrastructure

## Success Criteria

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] App builds successfully on iOS and Android
- [ ] No runtime errors in development
- [ ] Performance metrics maintained or improved
- [ ] All features working as expected
