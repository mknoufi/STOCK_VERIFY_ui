## 2024-05-22 - Custom Component Accessibility
**Learning:** Custom UI components like `Switch` often miss basic accessibility props (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`) that native components provide by default, making them invisible or unusable for screen reader users.
**Action:** Always audit custom interactive components for accessibility props and explicitly map them to the underlying native elements (e.g., `TouchableOpacity`). Ensure consumers can pass unique labels for each instance.
