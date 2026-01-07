import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeType = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

interface ThemeContextType {
  theme: ThemeType;
  fontSize: FontSize;
  setTheme: (theme: ThemeType) => void;
  setFontSize: (size: FontSize) => void;
  isDark: boolean;
  colors: any; // Replace with actual color type
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>("system");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("user_theme");
      const savedFontSize = await AsyncStorage.getItem("user_font_size");
      if (savedTheme) setThemeState(savedTheme as ThemeType);
      if (savedFontSize) setFontSizeState(savedFontSize as FontSize);
    } catch (error) {
      console.error("Failed to load theme settings", error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem("user_theme", newTheme);
  };

  const setFontSize = async (newSize: FontSize) => {
    setFontSizeState(newSize);
    await AsyncStorage.setItem("user_font_size", newSize);
  };

  const isDark =
    theme === "system" ? systemColorScheme === "dark" : theme === "dark";

  const colors = isDark
    ? {
        background: "#121212",
        surface: "#1E1E1E",
        text: "#FFFFFF",
        textSecondary: "#AAAAAA",
        border: "#333333",
        primary: "#BB86FC",
        error: "#CF6679",
      }
    : {
        background: "#FFFFFF",
        surface: "#F5F5F5",
        text: "#000000",
        textSecondary: "#666666",
        border: "#E0E0E0",
        primary: "#6200EE",
        error: "#B00020",
      };

  return (
    <ThemeContext.Provider
      value={{ theme, fontSize, setTheme, setFontSize, isDark, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
