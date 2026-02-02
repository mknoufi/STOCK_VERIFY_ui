## 2026-02-02 - Accessible PIN Keypads
**Learning:** Custom numeric keypads using `TouchableOpacity` are invisible to screen readers without explicit `accessibilityRole="button"` and `accessibilityLabel`. For PIN entry, the `accessibilityLiveRegion="polite"` on the dots container is critical to announce "X of Y digits filled" dynamically.
**Action:** Always add explicit roles/labels to custom keypad buttons and use live regions for feedback containers.
