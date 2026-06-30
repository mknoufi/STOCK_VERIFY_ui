## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.
## 2024-05-19 - Auto-map label and error to accessibility properties in generic Input
**Learning:** Screen readers often lose context when custom Input components render a label separately from the TextInput. We must explicitly map the custom `label` prop to the TextInput's `accessibilityLabel`. Furthermore, when error states occur, mapping the custom `error` prop to `aria-invalid` and `accessibilityErrorMessage` provides essential feedback for assistive technology users without requiring the component consumer to manually specify them every time.
**Action:** When creating reusable form field components in React Native, ensure built-in props like `label`, `error`, or `helperText` are automatically linked to their corresponding accessibility properties (`accessibilityLabel`, `accessibilityErrorMessage`, `aria-invalid`) on the underlying interactive element to provide full out-of-the-box screen reader support.
