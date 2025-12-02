// Feature flags for progressive rollout and experimentation
// Toggle features safely without invasive code changes

export const flags = {
  enableVirtualizedLists: true,
  enableHaptics: true,
  enableAnimations: true,
  enableDebugPanel: false,
  // Experimental high-performance theming via react-native-unistyles
  // Roadmap gates
  enableSwipeActions: false,
  enableUnistyles: false, // Disabled for Expo Go compatibility
  enableMockData: false,
  enableSentry: false,
  enableStorybook: false,
  enableDeepLinks: false,
  enableOfflineQueue: true,
  enableAnalytics: true, // Set to true for Sentry error tracking
  enableReactotron: false,
  enableNotes: false,
  enableMMKV: true,
} as const;

export type Flags = typeof flags;
