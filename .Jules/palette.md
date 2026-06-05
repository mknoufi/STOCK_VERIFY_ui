## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2026-03-05 - Custom Button Component Accessibility
**Learning:** Custom base components like `Button` or `RippleButton` built with `TouchableOpacity` do not automatically provide basic button roles or states to screen readers. If these foundation components omit `accessibilityRole="button"` and `accessibilityState`, every instance across the app becomes an unlabeled touch target without state context.
**Action:** Always ensure foundational UI elements explicitly accept and pass down `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, and dynamically compute `accessibilityState` (like `disabled` and `busy` for loading states) to the underlying React Native primitives.
