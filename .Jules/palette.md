## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-08-02 - Button Component Loading Layout Shift
**Learning:** Returning a separate loading component (like ActivityIndicator) conditionally inside a generic button component inherently breaks layout stability. If the button size relies on its children's dimensions (like text/icon widths), unmounting them causes the button width to shrink jarringly around the spinner, and breaks screen reader focus.
**Action:** When implementing async/loading states in reusable React Native buttons, always render the original text/icon children with `opacity: 0` (or `visibility: hidden` on web) to maintain dimensional stability, and place the loading indicator in `position: absolute` perfectly centered. Bind the `accessibilityState` to convey the `busy` state clearly to screen readers.
