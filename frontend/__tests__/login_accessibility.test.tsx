
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import LoginScreen from "../app/login";

// Mock dependencies
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Warning: "warning" },
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../src/store/authStore", () => ({
  useAuthStore: () => ({
    login: jest.fn(() => Promise.resolve({ success: true })),
    loginWithPin: jest.fn(() => Promise.resolve({ success: true })),
    loginWithBiometrics: jest.fn(),
    isBiometricEnabled: true,
    isBiometricSupported: true,
    enableBiometrics: jest.fn(),
    isLoading: false,
  }),
}));

// Mock ThemeContext
jest.mock("../src/theme/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        accent: "#6366F1",
        background: { default: "#0F172A" },
        text: { primary: "#F8FAFC", secondary: "#94A3B8" },
      },
    },
  }),
  useThemeContextSafe: () => ({
      theme: {
        colors: {
          accent: "#6366F1",
          background: { default: "#0F172A" },
          text: { primary: "#F8FAFC", secondary: "#94A3B8" },
        },
      },
    }),
}));

// Mock Premium components to avoid complex rendering issues if any
jest.mock("../src/components/premium/PremiumInput", () => ({
  PremiumInput: (props: any) => <>{props.label}</>,
}));

jest.mock("../src/components/premium/PremiumButton", () => ({
  PremiumButton: (props: any) => <>{props.title}</>,
}));

describe("Login Screen Accessibility", () => {
  it("renders keypad buttons with accessibility labels", () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    // Check for digit buttons (should fail initially as they lack accessibilityLabel)
    expect(getByLabelText("Enter digit 1")).toBeTruthy();
    expect(getByLabelText("Enter digit 5")).toBeTruthy();
    expect(getByLabelText("Enter digit 9")).toBeTruthy();
    expect(getByLabelText("Enter digit 0")).toBeTruthy();

    // Check for action buttons
    expect(getByLabelText("Login with biometrics")).toBeTruthy();
    expect(getByLabelText("Delete last digit")).toBeTruthy();
  });

  it("renders PIN entry status for screen readers", () => {
    const { getByLabelText } = render(<LoginScreen />);

    // Check for the PIN dots container
    expect(getByLabelText(/PIN entry, \d of 4 digits entered/)).toBeTruthy();
  });
});
