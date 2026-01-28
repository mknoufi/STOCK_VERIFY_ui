/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
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
    loginWithBiometrics: jest.fn(),
    isLoading: false,
    error: null,
    isAuthenticated: false,
    isBiometricEnabled: false,
    isBiometricSupported: true,
    enableBiometrics: jest.fn(),
  }),
}));

// Mock ThemeContext
jest.mock("../src/theme/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        primary: { 400: '#000', 600: '#000' },
        accent: { 600: '#000', default: '#000' },
        text: { primary: '#000', secondary: '#000', tertiary: '#000' },
        background: { default: '#000' }
      }
    },
  }),
}));

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock Haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));

// Mock Expo Blur
jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Safe Area
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));


describe("Login Screen Accessibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have accessible keypad buttons", () => {
    const { getByLabelText } = render(<LoginScreen />);

    // Check digits 1-9
    for (let i = 1; i <= 9; i++) {
      expect(getByLabelText(`Enter ${i}`)).toBeTruthy();
    }

    // Check digit 0
    expect(getByLabelText("Enter 0")).toBeTruthy();

    // Check backspace
    expect(getByLabelText("Backspace")).toBeTruthy();

    // Check mode switch button
    expect(getByLabelText("Switch to username and password login")).toBeTruthy();
  });
});
