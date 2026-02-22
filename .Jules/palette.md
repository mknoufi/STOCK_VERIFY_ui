## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-22 - Centralizing Common Actions for Accessibility
**Learning:** Inline implementations of common actions (like "Refresh") often miss accessibility details (labels, busy state, hitSlop) and consistent feedback (haptics), leading to a fragmented and less usable experience.
**Action:** Centralize common actions into reusable components (like `RefreshButton`) that enforce accessibility standards (min touch target, aria-busy) and interaction patterns (haptics) by default.
