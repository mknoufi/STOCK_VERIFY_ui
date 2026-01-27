## 2026-01-27 - [Hidden Components in Headers]
**Learning:** `ScreenHeader` defines its own internal `AnimatedButton` rather than using shared button components. This means accessibility fixes to shared buttons don't propagate to headers.
**Action:** When auditing navigation/header accessibility, check `ScreenHeader.tsx` directly as it's self-contained.
