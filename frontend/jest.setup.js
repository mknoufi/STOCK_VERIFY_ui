// Fix for "Cannot redefine property: window"
// This happens when jest-environment-jsdom defines window, and then react-native setup tries to define it again.
try {
  if (typeof window !== 'undefined') {
    delete global.window;
  }
} catch (e) {
  console.warn('Failed to delete window:', e);
}

// Jest setup: mock @expo/vector-icons to avoid act warnings in tests (CommonJS, no JSX)
const React = require("react");
const { View, Text } = require("react-native");

// Extend Jest matchers for React Native Testing Library
require("@testing-library/jest-native/extend-expect");

const MockIcon = ({ name = "icon", size = 16, color = "black", testID }) =>
  React.createElement(
    View,
    {
      style: { width: size, height: size },
      testID: testID || `mock-icon-${name}`,
    },
    React.createElement(Text, { style: { color } }, name),
  );

jest.mock("@expo/vector-icons", () => ({
  Ionicons: MockIcon,
  MaterialIcons: MockIcon,
  FontAwesome: MockIcon,
  Entypo: MockIcon,
  AntDesign: MockIcon,
  Feather: MockIcon,
  SimpleLineIcons: MockIcon,
  EvilIcons: MockIcon,
  Foundation: MockIcon,
  Zocial: MockIcon,
}));

// Mock Reanimated manually to avoid WorkletsError
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    default: {
      callOrderHook: jest.fn(),
      createAnimatedComponent: (component) => component,
      Value: jest.fn(),
      event: jest.fn(),
      addWhitelistedNativeProps: jest.fn(),
      addWhitelistedUIProps: jest.fn(),
    },
    useSharedValue: jest.fn((v) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v) => v),
    withSpring: jest.fn((v) => v),
    withRepeat: jest.fn((v) => v),
    withSequence: jest.fn((v) => v),
    useAnimatedProps: jest.fn(() => ({})),
    FadeIn: { duration: jest.fn(() => ({})) },
    FadeOut: { duration: jest.fn(() => ({})) },
    Layout: { springify: jest.fn(() => ({})) },
    View: View,
    Text: View,
    ScrollView: View,
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  whenAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));
