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

// Mock Expo vector icons to avoid async font-loading state updates in tests
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  const createIcon = (family) => {
    const Icon = ({ name, ...props }) =>
      React.createElement(Text, props, name ? `${family}:${name}` : family);
    Icon.glyphMap = {};
    return Icon;
  };

  return new Proxy(
    {},
    {
      get: (_target, prop) => createIcon(String(prop)),
    },
  );
});
