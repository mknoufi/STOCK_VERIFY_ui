## 2024-05-23 - Hardware Control Accessibility
**Learning:** Hardware controls (camera torch, zoom) are often overlooked in accessibility passes because developers test them visually. Icon-only buttons for these critical functions completely block screen reader users from using the core scanning feature.
**Action:** Always add dynamic `accessibilityLabel` (e.g., "Turn flash on/off") and `accessibilityState` to hardware toggles, and ensure zoom controls announce their purpose ("Zoom in/out") rather than just their icon name.

## 2024-05-22 - Custom Switch Accessibility
**Learning:** Custom UI components like `Switch` often miss default accessibility behaviors found in native components (role, state, label).
**Action:** Always verify custom interactive components expose `accessibilityRole`, `accessibilityState`, `accessibilityLabel`, and `accessibilityHint` props.

## 2024-05-24 - Speed Dial Menu Accessibility
**Learning:** Complex interactive components like "Speed Dial" (FAB with expanding menu) often lack state communication (expanded/collapsed) and context for icon-only actions, making them completely opaque to screen readers.
**Action:** Ensure main triggers use accessibilityState={{ expanded: boolean }} and accessibilityHint to explain the expansion behavior, and that child actions combine labels with badge counts for a complete announcement.
