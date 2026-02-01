import React from "react";
import { render } from "@testing-library/react-native";
import LoginScreen from "../app/login";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock stores
jest.mock("../src/store/authStore", () => ({
  useAuthStore: () => ({
    login: jest.fn(() => Promise.resolve({ success: true })),
    loginWithPin: jest.fn(() => Promise.resolve({ success: true })),
    loginWithBiometrics: jest.fn(() => Promise.resolve({ success: true })),
    isBiometricEnabled: true,
    isBiometricSupported: true,
    enableBiometrics: jest.fn(),
    isLoading: false,
    error: null,
    isAuthenticated: false,
  }),
}));

// Mock ThemeContext
jest.mock("../src/theme/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        accent: "#6366F1",
        background: { default: "#000000" },
        text: { primary: "#FFFFFF", secondary: "#AAAAAA", tertiary: "#666666" },
        primary: { 400: "#818CF8", 600: "#4F46E5" },
      },
    },
    isDark: true,
  }),
}));

// Mock native modules
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Warning: "warning" },
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Reanimated
global.ReanimatedDataMock = {
  now: () => 0,
};

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

describe("Login Screen Accessibility", () => {
  it("should have accessible labels for keypad buttons", () => {
    const { getByLabelText } = render(<LoginScreen />);

    // These should FAIL until implementation is added
    getByLabelText("Digit 1");
    getByLabelText("Digit 5");
    getByLabelText("Digit 0");
    getByLabelText("Backspace");
    getByLabelText("Biometric login");
  });

  it("should have accessible PIN indicator", () => {
    const { getByLabelText } = render(<LoginScreen />);
    // These should FAIL until implementation is added
    getByLabelText("PIN entry, 0 of 4 digits entered");
  });
});
