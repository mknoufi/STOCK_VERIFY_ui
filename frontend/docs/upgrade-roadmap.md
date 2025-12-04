# Frontend Upgrade Roadmap

This roadmap clarifies the phases, flags, acceptance criteria, and rollout for the Stock Verify frontend.

## Status Snapshot

- Phase 1 — Swipe Row Gestures: IMPLEMENTED behind `enableSwipeActions` (mobile only)
- Phase 2 — Smooth Transitions: IMPLEMENTED behind `enableAnimations`
- Phase 3 — Refined Haptics: IMPLEMENTED and guarded by `enableHaptics`
- Phase 4 — Deep Links (Filters): IMPLEMENTED behind `enableDeepLinks` on history
- Phase 5 — Offline Queue: Planned (persist + replay pattern)
- Phase 6 — Theming (Unistyles Gate): POC IMPLEMENTED behind `enableUnistyles`
- Phase 7 — Audit & Analytics Hooks: Planned (behind `enableAnalytics`)
- Dev Tooling — Reactotron: IMPLEMENTED behind `enableReactotron`
- Storage — MMKV: IMPLEMENTED for settings behind `enableMMKV`

## Phases

### Phase 1 — Swipe Row Gestures

- Scope: Swipe actions for `staff/history` rows.
- Flag: `enableSwipeActions` (default false)
- Tech: `react-native-gesture-handler` `Swipeable`
- Acceptance:
  - 60 FPS on common devices.
  - Web disabled; mobile only.
  - Haptics triggered on action where appropriate.

### Phase 2 — Smooth Transitions

- Scope: Bottom sheet slide + backdrop fade; skeleton shimmer.
- Flag: `enableAnimations` (default false)
- Tech: Reanimated (`withTiming`, `withSequence`, `withRepeat`)
- Acceptance:
  - Bottom sheet opens/closes ≤200ms without jank.
  - Skeleton fade does not cause layout shift.

### Phase 3 — Refined Haptics

- Scope: Selection/impact variants on common actions.
- Flag: `enableHaptics` (default true)
- Tech: Expo Haptics
- Acceptance:
  - No duplicate triggers per action.
  - No web haptic calls.

### Phase 4 — Deep Links (Filters)

- Scope: Shareable history filters via query params.
- Flag: `enableDeepLinks`
- Tech: Expo Router query params/segments
- Acceptance:
  - `/staff/history?sessionId=123&approved=1` restores filter state.
  - Back/forward preserves state.

### Phase 5 — Offline Queue (Planned)

- Scope: Persisted query cache + mutation queue for scans.
- Flag: `enableOfflineQueue`
- Tech: TanStack Query persist (storage), queue + replay on reconnect.
- Acceptance:
  - Offline actions marked as queued.
  - Replay on connectivity reliably; conflict surfaced.

### Phase 6 — Theming (Unistyles Gate)

- Scope: Experimental fast theming.
- Flag: `enableUnistyles`
- Tech: `react-native-unistyles` (lazy/dynamic import)
- Gate Criteria:
  - Theme switch latency < 5ms.
  - No regressions or crashes.

### Phase 7 — Audit & Analytics Hooks (Planned)

- Scope: Log gesture actions, filter changes, offline replays.
- Flag: `enableAnalytics`
- Tech: event dispatcher with minimal payload; no PII.
- Acceptance:
  - Low overhead; opt-out respected.

## Dev Tooling

- Reactotron (`enableReactotron`): Optional inspector for dev only.
- MMKV (`enableMMKV`): Faster persistence; currently applied to settings store.

## Rollout Strategy

1. Keep flags off by default.
2. Enable per-feature in dev; test device performance + UX.
3. Canary to a small user pool; monitor.
4. Gradual enablement across environments.
5. Roll back by flipping the flag.

## Frontend Upgrade Plan (Safe Steps)

> Validate versions in `package.json` before running upgrades.

1. Health checks
   - `yarn install`
   - `npx expo doctor`
   - `yarn typecheck && yarn lint`
2. Expo/RN tooling
   - Consider `npx expo upgrade` (interactive) and accept safe bumps.
   - Use `npx expo install <pkg>` to align versions (Reanimated, Gesture Handler, MMKV, Haptics).
3. Native modules (if enabling Unistyles/MMKV)
   - `expo prebuild` (only if your workflow requires native build sync)
4. Perf probes
   - Add simple timestamps around animations and sheet open/close.
5. QA
   - Smoke flows: login → scan → history; verify web/mobile parity.
6. E2E (optional)
   - Add 1–2 Maestro tests for critical paths.

## Owner & Files

- Owner: Mobile Team
- Key files:
  - `frontend/app/staff/history.tsx`
  - `frontend/components/ui/BottomSheet.tsx`
  - `frontend/components/LoadingSkeleton.tsx`
  - `frontend/components/SwipeableRow.tsx`
  - `frontend/services/haptics.ts`
  - `frontend/theme/*`
  - `frontend/store/*`
  - `frontend/constants/flags.ts`

## Notes

- All changes are reversible via flags.
- Web fallbacks are provided (no haptics/gestures where unsupported).
