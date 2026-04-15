## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-24 - Header and Card Component Action Button Accessibility
**Learning:** Icon-only action buttons in commonly used header and card components (like custom `PremiumHeader` action, logout, and menu, or a quick "Resume" in `SessionCard`) often miss essential ARIA/accessibility bindings when built with custom wrapper implementations like `TouchableOpacity`. This hides interactive capabilities from screen reader users.
**Action:** When implementing generic and customizable header components, extend props to include `accessibilityLabel` for consumer-provided actions, and manually bind `accessibilityRole="button"`, `accessibilityLabel`, and optionally `accessibilityHint` to static actions like "Log out", "Menu" or "Resume" buttons to ensure they are announced appropriately.
