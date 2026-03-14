## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2025-02-19 - [Proper Accessibility States for Expandable Components]
**Learning:** Adding `accessibilityRole="button"` and `accessibilityState={{ expanded: boolean }}` is vital for expandable components like Accordions. Without these, screen readers announce them as generic text/touch targets and users have no context that double-tapping will expand or collapse content. Providing specific `accessibilityHint` properties for both collapsed and expanded states helps guide interaction.
**Action:** When building custom collapsible components (like accordions or dropdown headers) using raw `TouchableOpacity`, always add `accessibilityRole="button"`, manage `accessibilityState.expanded` dynamically, and provide explicit, dynamic labels/hints indicating the resulting action.
