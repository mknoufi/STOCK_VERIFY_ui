## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-24 - Transient Feedback Accessibility
**Learning:** Visual-only feedback overlays (like toast notifications or scan results) are often completely missed by screen reader users if they don't use `accessibilityLiveRegion`.
**Action:** Always add `accessibilityLiveRegion="polite"` (or "assertive" for errors) and `accessibilityRole="alert"` to transient feedback components so they are announced automatically without moving focus.
