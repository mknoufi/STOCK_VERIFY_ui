## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-03-15 - Missing accessibility states in custom button components
**Learning:** Custom button components (like `Button` and `RippleButton`) implemented with `TouchableOpacity` often lack critical accessibility states such as `busy` (loading) or `disabled`, hiding important interactive context from screen readers. Even if disabled logic works correctly, without an explicitly declared `accessibilityState={{ disabled: true }}`, users utilizing screen readers are left unaware that interaction is blocked.
**Action:** Always ensure that custom button wrappers extend accessibility props (e.g., `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`) and dynamically pass down `accessibilityState` based on their internal properties (`disabled` or `loading`) to accurately reflect their true state to assistive technologies.
