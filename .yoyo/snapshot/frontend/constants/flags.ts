// Feature flags for progressive rollout and experimentation
// Toggle features safely without invasive code changes

export const flags = {
  enableVirtualizedLists: true,
  enableHaptics: true,
  enableNewScanner: false,
  enableDebugPanel: false,
  // Experimental high-performance theming via react-native-unistyles
  enableUnistyles: false,
  // Roadmap gates
  enableSwipeActions: false,
  enableAnimations: false,
  enableNotes: false,
  enableHelpResources: false,
  enableStorybook: false,
  enableDeepLinks: false,
  enableOfflineQueue: false,
  enableAnalytics: false, // Set to true for Sentry error tracking
  enableReactotron: false,
  enableMMKV: false, // Disabled: requires react-native-nitro-modules (not available in Expo Go)
} as const;

export type Flags = typeof flags;
