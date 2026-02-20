## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-20 - Navigation Link Accessibility
**Learning:** Navigation links implemented as `TouchableOpacity` wrapping `Text` are completely invisible to screen readers as actionable elements unless they have `accessibilityRole="button"`.
**Action:** Always wrap text-based navigation links in a container with `accessibilityRole="button"` and `accessibilityLabel` that describes the action (e.g., "Login"), even if the visible text seems self-explanatory.
