// Jest setup for Expo + React Native

// Testing Library matchers for React Native
require("@testing-library/jest-native/extend-expect");

// Mock AsyncStorage to avoid "NativeModule: AsyncStorage is null"
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock SecureStore to avoid native module dependencies in unit tests
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Mock NetInfo (used by networkService) to avoid native module dependencies
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    fetch: jest.fn(),
  },
}));

