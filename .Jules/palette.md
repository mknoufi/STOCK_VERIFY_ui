## 2024-05-22 - PIN Keypad Accessibility
**Learning:** Custom keypads often miss basic accessibility. Number buttons need explicit roles, and icon-only buttons (backspace, biometric) are invisible to screen readers without labels.
**Action:** Always verify custom keypad components for `accessibilityLabel` and `accessibilityRole`.
