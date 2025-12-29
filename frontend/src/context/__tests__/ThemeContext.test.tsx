import React from "react";
import { Text, View } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "../ThemeContext";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe("ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should provide default theme and font size", async () => {
    const TestComponent = () => {
      const { theme, fontSize } = useTheme();
      return (
        <View>
          <Text testID="theme-value">{theme}</Text>
          <Text testID="font-value">{fontSize}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("theme-value").props.children).toBe("system");
      expect(getByTestId("font-value").props.children).toBe("medium");
    });
  });

  it("should load saved theme and font size from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("dark")
      .mockResolvedValueOnce("large");

    const TestComponent = () => {
      const { theme, fontSize } = useTheme();
      return (
        <View>
          <Text testID="theme-value">{theme}</Text>
          <Text testID="font-value">{fontSize}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("theme-value").props.children).toBe("dark");
      expect(getByTestId("font-value").props.children).toBe("large");
    });
  });

  it("should persist theme changes to AsyncStorage", async () => {
    const TestComponent = () => {
      const { theme, setTheme } = useTheme();
      return (
        <View>
          <Text testID="theme-value">{theme}</Text>
          <Text
            testID="change-theme-btn"
            onPress={() => {
              void setTheme("dark");
            }}
          >
            Change
          </Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("theme-value")).toBeTruthy();
    });

    await act(async () => {
      getByTestId("change-theme-btn").props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("user_theme", "dark");
    });
  });

  it("should persist font size changes to AsyncStorage", async () => {
    const TestComponent = () => {
      const { fontSize, setFontSize } = useTheme();
      return (
        <View>
          <Text testID="font-value">{fontSize}</Text>
          <Text
            testID="change-font-btn"
            onPress={() => {
              void setFontSize("large");
            }}
          >
            Change
          </Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("font-value")).toBeTruthy();
    });

    await act(async () => {
      getByTestId("change-font-btn").props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "user_font_size",
        "large",
      );
    });
  });

  it("should provide color scheme based on theme", async () => {
    const TestComponent = () => {
      const { colors, theme } = useTheme();
      return (
        <View>
          <Text testID="theme-value">{theme}</Text>
          <Text testID="bg-color">{colors.background}</Text>
          <Text testID="text-color">{colors.text}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("bg-color")).toBeTruthy();
      expect(getByTestId("text-color")).toBeTruthy();
    });
  });

  it("should throw error when useTheme is used outside ThemeProvider", () => {
    const TestComponent = () => {
      useTheme();
      return null;
    };

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleSpy.mockRestore();
  });
});
