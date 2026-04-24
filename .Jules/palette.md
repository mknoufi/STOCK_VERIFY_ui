## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.
## 2024-06-15 - Dynamic Feedback Context in Search Inputs
**Learning:** In highly interactive components like custom search fields, screen reader users miss crucial state changes (like the number of results found) and struggle with internal icon-only buttons (like the "clear search" X).
**Action:** Always add `accessibilityRole="search"` and a descriptive `accessibilityLabel` to the core search input. Add `accessibilityLiveRegion="polite"` to dynamically updating text nodes (like results count) so the screen reader announces changes. Apply `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint` to icon-only "clear" `TouchableOpacity` buttons within the field.
