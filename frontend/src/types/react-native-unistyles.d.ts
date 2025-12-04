// Temporary module declaration so TypeScript does not error before dependency installation.
declare module "react-native-unistyles" {
  export const UnistylesProvider: React.ComponentType<any>;
  export const UnistylesRuntime: {
    getThemeName: () => string;
    setTheme: (name: string) => void;
  };
}
