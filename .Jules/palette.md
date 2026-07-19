## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2026-03-01 - Component Swap During Loading States Breaks A11y Focus
**Learning:** Returning a completely separate component (e.g., just an ActivityIndicator in a disabled view) when a button enters a loading state removes the original button from the accessibility tree, which breaks focus for screen reader users and causes layout jumps.
**Action:** Instead of returning a new component, maintain a single button wrapper and pass `accessibilityState={{ busy: true, disabled: true }}`. Keep the original text/icons but set their `opacity: 0`, and absolutely position the `ActivityIndicator` over them. This preserves layout and keeps the screen reader focused on the button while communicating its busy state.
