# Feature Flags

All enhancements are gated via flags in `frontend/constants/flags.ts`. Toggle in code or via a small dev settings screen (optional).

- `enableVirtualizedLists` (default: true)
  - Uses FlashList for large lists.
- `enableHaptics` (default: true)
  - Enables all haptic calls (mobile only).
- `enableNewScanner` (default: false)
  - Placeholder for future scanner module.
- `enableDebugPanel` (default: false)
  - Shows on-screen debug overlay.
- `enableUnistyles` (default: false)
  - Experimental theming via react-native-unistyles.
- `enableSwipeActions` (default: false)
  - Swipeable rows (mobile only) on history list.
- `enableAnimations` (default: false)
  - Reanimated transitions for bottom sheet and skeleton shimmer.
- `enableDeepLinks` (default: false)
  - Deep-linkable filters (e.g., `/staff/history?sessionId=123&approved=1`).
- `enableOfflineQueue` (default: false)
  - Persist + replay mutation queue when offline.
- `enableAnalytics` (default: false)
  - Sends app analytics/audit events for key actions.
- `enableReactotron` (default: false)
  - Dev-only Reactotron inspector.
- `enableMMKV` (default: false)
  - Use MMKV for faster persistent storage (currently applied to settings store).

Usage note:

- Keep flags off by default; enable in dev, then progressive rollout.
- With flags off, behavior is identical to the original app.
