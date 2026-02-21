## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-24 - Dynamic Loading State Labels
**Learning:** Icon-only buttons (like "Refresh") often lack context, especially during async operations. Screen readers might just announce "button" or the icon name, leaving users unsure if the action was triggered.
**Action:** When adding loading states to icon buttons, dynamically override the `accessibilityLabel` to "Loading..." (or similar status) to provide immediate, explicit feedback to non-visual users that the action is processing.
