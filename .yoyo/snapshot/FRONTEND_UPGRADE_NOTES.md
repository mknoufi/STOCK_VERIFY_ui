# Frontend Upgrade & Cleanup Notes (Nov 27, 2025)

This document summarizes the current frontend environment, the safe upgrade path, the cleanup performed in this pass, and verification steps.

## Current Stack (from `frontend/package.json`)

- Expo SDK: `~54.0.25`
- React Native: `0.81.5`
- React: `19.1.0`
- Expo Router: `~6.0.15`
- TypeScript: `~5.9.2`
- Key Expo libs (camera, image, file-system, notifications, etc.) are on matching SDK 54 ranges

## Safe Upgrade Procedure (patch/minor-only)

Use Expo to align all dependency patch versions without migrating SDKs:

```zsh
cd frontend
# Align dependency versions to SDK 54-compatible ranges
npx expo install

# Update non-managed packages to latest safe patch/minor
npm update

# Optional: audit for known issues (read-only)
npx expo-doctor
```

If you decide to migrate to a newer Expo SDK (e.g., 55/56+), run the guided flow and follow release notes carefully:

```zsh
cd frontend
npx expo install --fix
npx expo-doctor
```

## Post-Upgrade Verification

Run linting, type checks, and tests:

```zsh
cd frontend
npm run lint
npm run typecheck
npm test
```

Clear Metro cache and rebuild to avoid stale bundles:

```zsh
rm -rf $TMPDIR/metro-* $TMPDIR/haste-map-*
npx expo start -c
```

## Cleanup Performed (no behavioral changes)

File: `frontend/app/staff/scan.tsx`

- Standardized photo state usage:
  - `facing={photoState.photoCameraType}` (legacy `photoCameraType` removed)
  - Camera flip uses `updatePhotoState` to toggle `photoState.photoCameraType`
  - Photo type pills use `photoState.selectedPhotoType` + `updatePhotoState`
  - Photo counts/previews use `photoState.photoProofs`
  - Shutter disable/spinner uses `photoState.photoCaptureLoading`
- Removed unused code:
  - Unused `AlertButton` import and unused `optimizeCamera` variable
  - Unused local UI states (`showSearchModal`, `showMasterEditModal`, `verificationNotes`, `editForm`)
  - Unused `duplicateDetected` flag in one serial-update path (alert retained)

## Lint/Typecheck Findings (summary)

A number of warnings remain in `scan.tsx` and tests; most are:

- React hook dependency warnings (adding deps may change behavior; defer to focused refactors)
- Unused error variables in `catch` blocks; switch to `catch {}` or log when appropriate
- A few unused helpers in `scan.tsx` (e.g., `updateCountLine`, `showCountDetails`) — keep or remove in a dedicated refactor

These are intentionally left as-is to avoid changing runtime behavior during a patch-level cleanup. Consider addressing them with targeted refactors and tests.

## Suggested Next Steps

- Run fast autofix and recheck locally:

  ```zsh
  cd frontend
  npx eslint . --ext .ts,.tsx,.js --fix
  npm run typecheck
  npm test
  ```

- Smoke test Scan screen:
  - Open Photo Capture, flip camera, capture/remove photos, verify no ReferenceErrors.
- If needed, schedule a focused refactor to resolve remaining hook dependency warnings with unit/integration tests.
