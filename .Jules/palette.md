## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-24 - Custom Action Button States
**Learning:** Custom UI components built around `TouchableOpacity` (like `Button` or `RippleButton`) do not automatically announce their `disabled` or `busy` (loading) states to screen readers unless explicitly told to do so via `accessibilityState`. A button that looks disabled visually or shows a loading spinner but doesn't map to `accessibilityState={{ disabled: true, busy: true }}` leaves visually impaired users confused or assuming the button is still clickable.
**Action:** Always map the internal `disabled` and `loading` props of custom action buttons directly to the `accessibilityState` prop of the underlying touchable element, and explicitly set `accessibilityRole="button"`.
