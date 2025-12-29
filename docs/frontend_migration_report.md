## Frontend Migration Readiness Report (Baseline)

### Current State
- **Architecture**: Multiple theme systems in use (`globalStyles`, `modernDesignSystem`, `auroraTheme`/`ThemeContext`, legacy `useTheme`); duplicated auth/navigation logic across `_layout.tsx`, `app/index.tsx`, `app/welcome.tsx`; oversized screens (e.g., `app/staff/home.tsx` was 1,300+ lines before partial extraction).
- **Tooling/CI**: CI now pinned to Node 18.18.2 and uses `npm ci --ignore-scripts` with `SKIP_POSTINSTALL=true`. `postinstall` still runs `patch-package` if the flag is missing.
- **UX/A11y/Responsive**: Bold visuals but inconsistent tokens; ad-hoc breakpoints; many touchables lack `accessibilityRole/Label`; focus styles absent on web.
- **Testing**: Jest configured; low coverage relative to surface area; limited e2e. Critical flows (auth redirect, session create/resume) lack automated coverage.
- **Observability**: Sentry and a global ErrorBoundary exist; runtime payload validation is minimal.

### Risks (ordered)
1. Theme/token fragmentation leading to visual drift and slower refactors.
2. Navigation/auth duplication causing redirect loops or role drift.
3. React 19 → 18 + Reanimated adjustments may break gestures/animations.
4. Non-deterministic installs when `postinstall` runs without `SKIP_POSTINSTALL`.
5. Low test coverage → regressions during migrations; limited a11y/responsiveness.

### Recommended Tests to Add (fast ROI)
- **Auth/Navigation Smoke**: Mock user roles and assert final route (staff → `/staff/home`, supervisor/admin → `/supervisor/dashboard` or `/admin/metrics` on web). Targets: `_layout.tsx`, `app/index.tsx`.
- **Session Create/Resume**: Validate `handleStartNewSection` rules (location/floor required, rack format/length) and navigation to `/staff/scan` after `createSession`. Extract logic into a hook for easy testing.
- **Section Lists**: Render tests for `SectionLists` (search toggle, empty/active/finished states).
- **Theme Shim**: Snapshot a minimal component consuming both legacy tokens and ThemeContext to ensure consistent colors/spacing post-consolidation.
- **Animation/Gesture Smoke**: Ensure Reanimated-based components render without throwing (e.g., AuroraBackground + GlassCard) before React downgrade.

### Actions by Migration Phase
- **migrate/00-baseline-lock**: Enforce `SKIP_POSTINSTALL=true npm ci --ignore-scripts`; document preflight; script or ignore snapshot artifacts to reduce status noise; run gates (`npm ci --ignore-scripts`, `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand`, `expo doctor`).
- **migrate/01-react-downgrade**: Downgrade to React 18.3 + matching renderer; align navigation guard via shared helper; add auth/navigation smoke tests.
- **migrate/02-reanimated-stabilize**: Pin Reanimated/gesture-handler; audit animations/modals/lists; add regression tests for session flows and modals; validate on low-end Android.
- **migrate/03-tooling-rationalize**: Consolidate CI entry (`npm run ci`), keep `SKIP_POSTINSTALL` enforcement, prune unused scripts.
- **migrate/04-observability**: Add runtime validation (e.g., Zod for API responses), structured logging for auth/session/sync, consistent user-facing error toasts; plan expo-updates.

### Recommended Cleanups
- Theme consolidation plan: choose ThemeContext + `themes.ts`, provide a shim for legacy token names, migrate top screens (welcome, login, staff/supervisor dashboards) first.
- Extract large screen logic into components/hooks (session form/modal, floor picker, scan CTA) and apply the pattern to supervisor/admin screens.
- Add a lightweight a11y helper (roles/labels/focus ring) and breakpoint utilities for responsive layouts.

### Preflight Command (reproducible installs)
```bash
cd frontend
SKIP_POSTINSTALL=true npm ci --ignore-scripts
npm run lint
npm run typecheck
npm run test -- --runInBand
expo doctor
```
