// Jest setup for React Native / Expo
// - Mocks AsyncStorage to avoid NativeModule errors in Jest
// - Extends jest-native matchers

import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage to the official Jest mock implementation
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-reanimated to avoid JSI/native issues in Jest
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
