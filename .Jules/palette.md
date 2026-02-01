## 2024-05-22 - Accessibility in Custom Keypads
**Learning:** Custom UI components like PIN keypads often use icon-only buttons or generic touchables that lack semantic meaning for screen readers. Explicit `accessibilityLabel` and `accessibilityRole` are critical for these non-standard inputs.
**Action:** Always verify custom input methods (keypads, dials, sliders) have explicit accessibility attributes, especially when they deviate from native form controls.
