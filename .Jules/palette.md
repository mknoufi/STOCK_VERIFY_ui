## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-15 - Missing Accessibility Labels on Icon-Only UI Components
**Learning:** Custom interactive UI components like `SpeedDialMenu` and `PremiumHeader` that rely exclusively on visual icons (like Ionicons) without accompanying text frequently omit `accessibilityLabel` and `accessibilityRole`. This is a common accessibility trap when developers focus purely on "modern" glassmorphic or animated aesthetics. Screen readers just hear "button" or nothing at all, making these key navigation and action items completely invisible to visually impaired users.
**Action:** Always ensure that icon-only `TouchableOpacity` or `Animated.View` interactive components include an explicit `accessibilityLabel` that describes the action (e.g., "Menu", "Log out", or the specific action label) and an `accessibilityRole="button"`. For toggle states, include `accessibilityState={{ expanded: boolean }}`.
