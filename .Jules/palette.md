## 2026-02-10 - Inline Keypad Accessibility
**Learning:** Custom numeric keypads often rely on visual labels only, leaving screen reader users completely blocked from critical flows like login.
**Action:** Always wrap custom keypad buttons in `accessibilityRole="button"` and provide explicit labels for non-numeric keys like biometrics/backspace. Use `accessibilityLiveRegion="polite"` for input indicators.
