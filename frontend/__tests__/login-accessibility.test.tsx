/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../app/login";

// Polyfill for setImmediate/clearImmediate which are missing in JSDOM
// but required by React Native's StatusBar
if (typeof setImmediate === 'undefined') {
  global.setImmediate = ((fn: any, ...args: any[]) => setTimeout(fn, 0, ...args)) as any;
}
if (typeof clearImmediate === 'undefined') {
  global.clearImmediate = ((id: any) => clearTimeout(id)) as any;
}

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useAuthStore
jest.mock("../src/store/authStore", () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    loginWithPin: jest.fn(),
    loginWithBiometrics: jest.fn(),
    isBiometricEnabled: true,
    isBiometricSupported: true,
    enableBiometrics: jest.fn(),
    isLoading: false,
    error: null,
    isAuthenticated: false,
  }),
}));

// Mock useThemeContext
jest.mock("../src/theme/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        accent: "#6366f1",
        background: "#0f172a",
        text: "#f8fafc",
        textSecondary: "#94a3b8",
        danger: "#ef4444",
      },
      spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
      radius: { sm: 4, md: 8, lg: 12, xl: 16 },
    },
  }),
  useThemeContextSafe: () => ({
    theme: {
      colors: {
        accent: "#6366f1",
        background: "#0f172a",
        text: "#f8fafc",
        textSecondary: "#94a3b8",
        danger: "#ef4444",
      },
      spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
      radius: { sm: 4, md: 8, lg: 12, xl: 16 },
    },
  }),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Warning: "warning" },
}));

// Mock reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-blur
jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Safe Area
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("Login Screen Accessibility", () => {
  it("should have accessible keypad buttons", () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    // Check for digits 0-9
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((digit) => {
      // Should find by accessibility label "Digit X"
      // If this fails, it means we need to add the label
      const button = getByLabelText(`Digit ${digit}`);
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe("button");
    });
  });

  it("should have accessible backspace button", () => {
    const { getByLabelText } = render(<LoginScreen />);
    const backspace = getByLabelText("Backspace");
    expect(backspace).toBeTruthy();
    expect(backspace.props.accessibilityRole).toBe("button");
    expect(backspace.props.accessibilityHint).toBe("Deletes the last entered digit");
  });

  it("should have accessible biometric button when enabled", () => {
    const { getByLabelText } = render(<LoginScreen />);
    const biometric = getByLabelText("Biometric Login");
    expect(biometric).toBeTruthy();
    expect(biometric.props.accessibilityRole).toBe("button");
  });

  it("should have accessible mode switch button", () => {
    const { getByLabelText } = render(<LoginScreen />);
    const switchButton = getByLabelText("Switch to username and password login");
    expect(switchButton).toBeTruthy();
    expect(switchButton.props.accessibilityRole).toBe("button");
  });
});
