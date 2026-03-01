## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-15 - [RefreshButton Accessibility]
**Learning:** Icon-only buttons without labels (like `RefreshButton` component) are completely opaque to screen readers in React Native, leading to inaccessible user interfaces. Native interactive elements (`TouchableOpacity`) require explicit `accessibilityRole="button"`, `accessibilityLabel`, and often `accessibilityState` to properly represent their function to assistive technologies.
**Action:** Always verify that custom icon-only components wrap standard touchables and pass down necessary `accessibilityLabel`, `accessibilityHint`, and `accessibilityState` props. Ensure a default `accessibilityLabel` is provided if one isn't passed as a prop for common icons (like "Refresh").
