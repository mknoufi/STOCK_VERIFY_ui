## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-24 - Transient Overlay Accessibility
**Learning:** Full-screen transient overlays (like scan feedback) that block interaction must announce their content via `accessibilityLiveRegion`. Without it, screen reader users might not know why the screen is unresponsive or what the feedback was.
**Action:** Use `accessibilityLiveRegion="assertive"` for critical feedback (errors) and `"polite"` for non-critical (success), along with `accessibilityViewIsModal={true}` if the overlay covers the screen.
