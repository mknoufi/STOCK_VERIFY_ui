/* global jest */
// jest.setup.js
// Basic RN / Expo mocks that commonly help tests start cleanly
import 'react-native-gesture-handler/jestSetup';

// silence unwanted native module warnings in tests
// jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');

// mock any native modules you depend on here
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
