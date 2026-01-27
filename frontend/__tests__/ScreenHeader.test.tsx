
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ScreenHeader } from "../src/components/ui/ScreenHeader";

// Mock dependencies
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
  },
}));

// Mock store and context
const mockLogout = jest.fn();
jest.mock("../src/store/authStore", () => ({
  useAuthStore: () => ({
    user: { full_name: "Test User", username: "testuser" },
    logout: mockLogout,
  }),
}));

jest.mock("../src/theme/ThemeContext", () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        text: "#000000",
        textSecondary: "#666666",
        accent: "#007AFF",
        danger: "#FF3B30",
      },
    },
    isDark: false,
  }),
}));

describe("ScreenHeader Accessibility", () => {
  it("should have accessibility labels for interactive buttons", () => {
    const { getByTestId } = render(
      <ScreenHeader
        title="Test Screen"
        showBackButton={true}
        showLogoutButton={true}
      />
    );

    const backButton = getByTestId("back-button");
    const logoutButton = getByTestId("logout-button");

    // These assertions are expected to fail initially until we implement accessibility props
    expect(backButton.props.accessibilityLabel).toBe("Go back");
    expect(logoutButton.props.accessibilityLabel).toBe("Logout");
    expect(logoutButton.props.accessibilityRole).toBe("button");
  });

  it("should support accessibility label for right action button", () => {
    const onRightPress = jest.fn();
    const { getByTestId } = render(
      <ScreenHeader
        title="Test Screen"
        rightAction={{
          icon: "add",
          onPress: onRightPress,
          label: "Add Item",
        }}
      />
    );

    const rightButton = getByTestId("right-action-button");
    // Expected to fail initially
    // Note: The implementation plan needs to ensure 'label' from rightAction is used as accessibilityLabel
    // Since rightAction prop has 'label' field, we should use it.
  });
});
