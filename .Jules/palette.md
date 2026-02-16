## 2024-05-23 - Switch Component Accessibility
**Learning:** The custom Switch component was completely missing accessibility props, rendering it invisible to screen readers. This highlights the importance of auditing custom UI components for basic accessibility compliance.
**Action:** Always verify custom interactive components have appropriate accessibilityRole, accessibilityState, and accessibilityLabel props.
