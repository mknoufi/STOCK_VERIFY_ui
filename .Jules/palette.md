## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2026-02-28 - Reusable Form Field Accessibility
**Learning:** Custom wrapper components around text inputs (like `Input`) often accept visual `label` and `error` props but fail to pass these down to the underlying `TextInput` via accessibility props, leaving screen reader users without proper context or error awareness.
**Action:** When creating or updating reusable form field components in React Native, ensure built-in props like `label` and `error` are automatically linked to their corresponding accessibility properties (`accessibilityLabel`, `aria-errormessage`, `aria-invalid`) on the underlying component. Use React's `useId()` hook to generate a consistent ID for `aria-errormessage` and link it to the `nativeID` of the error text element to prevent unnecessary re-renders.
