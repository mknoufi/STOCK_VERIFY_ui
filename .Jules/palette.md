## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2025-05-15 - Premium Nav Component Accessibility
**Learning:** Custom 'premium' or stylized layout components like `PremiumHeader` often rely on icon-only navigation elements (menu buttons, custom actions, log out). These are frequently skipped during a11y reviews but are critical since they appear on almost every screen. Screen readers receive zero context without proper labeling on these interactive elements.
**Action:** Always add `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint` to any `TouchableOpacity` acting as an icon-only button within headers, footers, and global navigation components. Extend props interfaces to accept `accessibilityLabel` when rendering dynamic custom actions.
