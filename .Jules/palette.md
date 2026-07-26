## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-07-26 - Maintain Screen Reader Focus During Loading States
**Learning:** In React Native, returning a completely separate loading component (like an isolated `<ActivityIndicator>` or a new wrapper) instead of the original button during a loading state causes the element to be completely removed from the accessibility tree. This breaks focus for screen reader users abruptly.
**Action:** Instead of conditionally unmounting the button, preserve the single interactive wrapper (e.g. `TouchableOpacity`), set `accessibilityState={{ busy: true, disabled: true }}`, hide the original content visually using `opacity: 0`, and absolutely position the loading indicator over it. This preserves layout dimensions and maintains active screen reader focus on the same element.
