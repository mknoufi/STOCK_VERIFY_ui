/**
 * @jest-environment jsdom
 */
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

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Warning: "warning" },
}));

// Mock expo-status-bar
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-blur
jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

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
        primary: "#3b82f6",
        accent: "#6366f1",
        text: "#f8fafc",
        background: "#0f172a",
        surface: "#1e293b",
        error: "#ef4444",
      },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    },
    isDark: true,
  }),
}));

describe("Login Screen Accessibility", () => {
  it("should have accessible labels for PIN keypad", () => {
    const { getByLabelText } = render(<LoginScreen />);

    // Check for digits 0-9
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((digit) => {
      // We expect labels like "Enter digit 1" or similar
      // Since we haven't implemented it yet, this test will fail, which is expected (TDD style)
      // But for now, I'll assert on what I INTEND to implement.
      expect(getByLabelText(`Enter digit ${digit}`)).toBeTruthy();
    });
  });

  it("should have accessible label for backspace button", () => {
    const { getByLabelText } = render(<LoginScreen />);
    expect(getByLabelText("Delete last digit")).toBeTruthy();
  });

  it("should have accessible label for biometric button", () => {
    const { getByLabelText } = render(<LoginScreen />);
    expect(getByLabelText("Biometric login")).toBeTruthy();
  });

  it("should have accessible label for mode switch button", () => {
    const { getByLabelText } = render(<LoginScreen />);
    expect(getByLabelText("Switch to username and password login")).toBeTruthy();
  });
});
