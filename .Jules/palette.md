## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-06-25 - Transient Overlay Accessibility Pitfalls
**Learning:** Adding `accessible={true}` to a parent container of a transient overlay (like a Toast or Modal) groups all children into a single non-interactive element for screen readers. This completely hides any internal interactive elements (like action or dismiss buttons) from the focus tree, preventing users from interacting with them.
**Action:** Only apply `accessibilityRole="alert"` and `accessibilityLiveRegion` to the transient overlay's main container to announce its presence. Ensure internal interactive elements (like dismiss buttons) individually define their own `accessibilityRole` and `accessibilityLabel` without setting `accessible={true}` on the parent container.
