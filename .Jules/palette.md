## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-24 - Transient Overlay Accessibility
**Learning:** Visual-only overlays (like scan feedback) with `pointerEvents="none"` are often ignored by screen readers, making them inaccessible. Standard accessibility props on the container may not work because the view is technically not interactive.
**Action:** Use `AccessibilityInfo.announceForAccessibility(message)` within a `useEffect` hook to imperatively announce the feedback message when the overlay appears. This ensures screen reader users receive the status update regardless of the view's interactivity.
