# Palette's Journal - UX & Accessibility Learnings

## 2025-02-05 - Custom PIN Keypad Accessibility
**Learning:** Custom interactive elements built with `TouchableOpacity` (like the PIN keypad) completely lack accessibility context by default. Screen readers will read the text inside but won't announce them as buttons or explain their purpose (e.g., "Digit 1" vs just "1").
**Action:** Always add `accessibilityRole="button"` and explicit `accessibilityLabel` (e.g., "Digit X") to custom touchables. Use `accessibilityHint` for non-obvious actions like "Switch Login Mode".
