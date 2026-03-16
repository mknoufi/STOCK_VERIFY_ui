## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2026-03-16 - Icon-Only Button Accessibility in Core Components
**Learning:** Icon-only action buttons (like `RefreshButton` and `LogoutButton`) are frequently used but completely inaccessible to screen reader users if they lack proper accessibility props, providing no context about their function or state.
**Action:** Always verify custom interactive components like `RefreshButton` and `LogoutButton` implement `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint`, and dynamic `accessibilityState` (including `busy` and `disabled` mapping to loading states) to ensure screen reader compatibility, especially when rendered in an icon-only mode.
