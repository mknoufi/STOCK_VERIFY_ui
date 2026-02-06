## 2025-02-18 - Accessibility on Custom Controls
**Learning:** Custom interactive components like `Switch` built with `TouchableOpacity` often lack semantic accessibility roles and state, making them invisible or confusing to screen reader users.
**Action:** Always check `accessibilityRole` and `accessibilityState` on custom UI components, especially those mimicking native controls.
