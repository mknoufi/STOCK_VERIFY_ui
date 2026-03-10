## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-03-10 - Custom Action Button Accessibility Constraints
**Learning:** Custom interactive components (like `TouchableOpacity` wrappers) do not automatically infer or forward their intended function to screen readers. For example, a custom `Button` component visually representing an action needs explicit semantic tagging to be properly identified by assistive technology. Furthermore, the `disabled` and `loading` states need to be explicitly managed within `accessibilityState` to properly alert users of async operations.
**Action:** When creating or updating custom generic interactive components (like `Button`, `Input`, `Checkbox`), explicitly expose and define `accessibilityRole`, `accessibilityState` (like `disabled` and `busy`), `accessibilityLabel`, and `accessibilityHint` in the component interface. Ensure they pass these props to the interactive underlying root component.
