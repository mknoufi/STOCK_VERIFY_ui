## 2025-02-18 - [ScreenHeader Accessibility]
**Learning:** Custom header components like `ScreenHeader` often define internal button components (e.g., `AnimatedButton`) that completely lack accessibility props, creating barriers for icon-only buttons.
**Action:** When auditing headers, check internal button implementations for `accessibilityLabel` and `accessibilityRole`.
