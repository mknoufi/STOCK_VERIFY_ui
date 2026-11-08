## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-24 - Transient State Icon Buttons and Focus Loss
**Learning:** Returning a completely separate loading component inside a button removes the original icon from the accessibility tree, breaking focus for screen readers. Furthermore, transient state icon buttons (like `RefreshButton`) require explicit labeling to be audible, and their 'busy' state must be conveyed via `accessibilityState={{ disabled: loading, busy: loading }}` so users know an asynchronous action is actively occurring.
**Action:** Always maintain a single button wrapper. Keep the original content (text or icon) wrapped in a `View` with `opacity: loading ? 0 : 1`, absolutely position the `ActivityIndicator`, and apply `accessibilityState={{ disabled: loading, busy: loading }}`.
