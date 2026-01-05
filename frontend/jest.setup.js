// Jest setup for Expo + React Native

// Fix for "The global process.env.EXPO_OS is not defined" warning
if (!process.env.EXPO_OS) {
  process.env.EXPO_OS = "ios";
}

// Testing Library matchers for React Native (built into @testing-library/react-native v12.4+)
// No longer need separate jest-native package

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, {}, children),
    SafeAreaView: ({ children, style }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => inset,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets: inset,
    },
  };
});

// Mock AsyncStorage to avoid "NativeModule: AsyncStorage is null"
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock SecureStore to avoid native module dependencies in unit tests
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: {
    Screen: jest.fn(() => null),
  },
  Link: jest.fn(({ children }) => children),
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }) => children,
}));

// Mock expo-blur
jest.mock("expo-blur", () => ({
  BlurView: ({ children }) => children,
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock react-native-reanimated (v4.2+ compatible)
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Text, Image, ScrollView } = require("react-native");

  // Create animated component wrapper
  const createAnimatedComponent = (Component) => {
    const AnimatedComponent = React.forwardRef((props, ref) => {
      // Filter out reanimated-specific props
      const { entering, exiting, layout, animatedProps, ...rest } = props;
      return React.createElement(Component, { ...rest, ref });
    });
    AnimatedComponent.displayName = `Animated(${Component.displayName || Component.name || "Component"})`;
    return AnimatedComponent;
  };

  const Animated = {
    View: createAnimatedComponent(View),
    Text: createAnimatedComponent(Text),
    Image: createAnimatedComponent(Image),
    ScrollView: createAnimatedComponent(ScrollView),
    createAnimatedComponent,
    call: () => {},
    addWhitelistedNativeProps: () => {},
    addWhitelistedUIProps: () => {},
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn) => ({ value: typeof fn === "function" ? fn() : fn }),
    useAnimatedProps: () => ({}),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedReaction: () => {},
    useAnimatedScrollHandler: () => ({}),
    useReducedMotion: () => false,
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
    withTiming: (val) => val,
    withSpring: (val) => val,
    withDecay: (val) => val,
    withDelay: (_, val) => val,
    withSequence: (...vals) => vals[vals.length - 1],
    withRepeat: (val) => val,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: (val) => val,
    Extrapolate: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      quad: (t) => t,
      cubic: (t) => t,
      bezier: () => (t) => t,
      in: (fn) => fn,
      out: (fn) => fn,
      inOut: (fn) => fn,
    },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: {
      duration: () => ({ delay: () => ({}) }),
      delay: () => ({ duration: () => ({}) }),
    },
    FadeInUp: { duration: () => ({ delay: () => ({}) }) },
    SlideInRight: { duration: () => ({}) },
    SlideOutRight: { duration: () => ({}) },
    Layout: { duration: () => ({}) },
    LinearTransition: { duration: () => ({}) },
    ZoomIn: { duration: () => ({}) },
    ZoomOut: { duration: () => ({}) },
    createAnimatedComponent,
    View: createAnimatedComponent(View),
    Text: createAnimatedComponent(Text),
    Image: createAnimatedComponent(Image),
    ScrollView: createAnimatedComponent(ScrollView),
  };
});

// Mock react-native-worklets
jest.mock("react-native-worklets", () => ({
  __esModule: true,
  default: {},
  useWorklet: () => {},
  createWorklet: () => {},
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  FontAwesome: "FontAwesome",
}));

// Mock react-native-svg
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props) => React.createElement(View, props),
    Circle: (props) => React.createElement(View, props),
    Line: (props) => React.createElement(View, props),
    Path: (props) => React.createElement(View, props),
    Defs: (props) => React.createElement(View, props),
    Pattern: (props) => React.createElement(View, props),
    Rect: (props) => React.createElement(View, props),
    LinearGradient: (props) => React.createElement(View, props),
    Stop: (props) => React.createElement(View, props),
    Svg: (props) => React.createElement(View, props),
  };
});

// Mock Modal component to avoid "window is not defined" error in tests
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockModal = ({ children, visible, ...props }) => {
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: "modal-mock", ...props },
      children,
    );
  };
  MockModal.displayName = "Modal";
  return {
    __esModule: true,
    default: MockModal,
  };
});
