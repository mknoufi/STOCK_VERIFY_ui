## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-23 - Accessible Transient Overlay Notifications
**Learning:** Transient overlay components (like Toast notifications) are not naturally announced by screen readers when they appear, making critical context (like "Save successful" or "Sync failed") invisible to non-sighted users. Their internal action buttons (like "Dismiss" or "Undo") also lack context if they are icon-only or dynamic text without explicit roles.
**Action:** Always add `accessibilityRole="alert"` and `accessibilityLiveRegion` (set to "assertive" for errors, "polite" for info) to the transient feedback elements. Never wrap these elements in an `accessible={true}` view if they contain interactive children (like action buttons), as React Native groups all child elements into a single non-interactive selectable element for screen readers. Always add explicit `accessibilityRole="button"`, `accessibilityLabel`, and `accessibilityHint` to their internal action buttons.
