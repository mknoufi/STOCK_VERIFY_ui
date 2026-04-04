## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.
## 2024-04-04 - Missing Accessibility Props on Interactive Primitives
**Learning:** React Native `TouchableOpacity` components used to build custom interactive primitives (like `Checkbox`, `Radio`, or even generic `Button` variants) do NOT implicitly carry semantic roles, state (like `checked`, `busy`, or `disabled`), or descriptive labels to screen readers by default. Grouping `accessible={true}` without correctly defining these properties leads to inaccessible controls.
**Action:** Always explicitly define `accessibilityRole` (e.g., "checkbox", "radio", "button"), map visual states to `accessibilityState` (e.g., `checked`, `disabled`, `busy`), and ensure a descriptive `accessibilityLabel` is provided or dynamically generated (falling back to a title/description) for all custom interactive primitives built with `TouchableOpacity` or `Pressable`.
