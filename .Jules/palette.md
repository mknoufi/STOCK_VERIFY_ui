## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2026-02-28 - Icon-Only Button Accessibility in Search
**Learning:** Icon-only action buttons (like scan barcode, voice search, and submit inputs) are completely inaccessible to screen reader users if missing proper accessibility props, as they provide no context about their function.
**Action:** Always add `accessibilityRole="button"` and an explicit `accessibilityLabel` (e.g., "Scan barcode with camera") to icon-only `TouchableOpacity` elements, along with `accessibilityState` for dynamic states like disabled or checked.

## 2024-05-24 - Action Button and Async Operations Accessibility
**Learning:** Crucial application action buttons, like Logout or Delete, that support multiple configurations (icon-only, text-only, or both) and async loading states require comprehensive accessibility support. If an icon-only variant omits `accessibilityLabel`, it becomes an anonymous button to screen readers. Furthermore, when these buttons show a loading spinner, replacing their content without managing `accessibilityState={{ busy: true, disabled: true }}` confuses assistive technology.
**Action:** Consistently enforce that all primary action buttons, regardless of visual configuration (especially icon-only variants), explicitly define `accessibilityRole="button"`, a descriptive `accessibilityLabel`, a helpful `accessibilityHint`, and dynamically bind `accessibilityState` to accurately reflect loading and disabled states.
