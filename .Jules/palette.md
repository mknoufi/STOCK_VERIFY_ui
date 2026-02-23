## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-23 - Transient Feedback Accessibility
**Learning:** Transient visual feedback (like scan success/error overlays) is completely invisible to screen readers without `accessibilityLiveRegion`. Using `pointerEvents="none"` for visual pass-through doesn't prevent accessibility announcements if the node exists.
**Action:** For auto-dismissing overlays, always use `accessibilityRole="alert"` and set `accessibilityLiveRegion` to "assertive" for errors and "polite" for success to ensure users hear the result immediately.
