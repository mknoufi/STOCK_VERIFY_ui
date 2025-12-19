import { useColorScheme } from "react-native";

export const useSystemTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme || "light";
};
