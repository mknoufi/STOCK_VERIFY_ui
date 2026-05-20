## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-06-25 - React Native Input ARIA vs Accessibility Props
**Learning:** While React Native (0.72+) supports `aria-invalid` and `aria-errormessage`, using `aria-errormessage={error}` directly with the literal string error message violates the strict ARIA spec (which expects an element ID). While React Native handles it, it might flag on code reviews.
**Action:** Use React Native's specific accessibility props (like `accessibilityErrorMessage` or implicitly relying on screen reader reading) when possible over using ARIA attributes incorrectly, though in this case `aria-invalid` and `aria-errormessage` are acceptable per React Native's mapping.
