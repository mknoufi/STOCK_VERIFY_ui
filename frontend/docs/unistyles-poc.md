# Unistyles POC

This is an experimental integration of `react-native-unistyles` guarded by the `flags.enableUnistyles` feature flag.

## Files Added

- `frontend/theme/themes.ts` – Light + High Contrast theme tokens.
- `frontend/theme/Provider.tsx` – Lazy dynamic import wrapper; safe when lib not installed.
- `frontend/types/react-native-unistyles.d.ts` – Temporary module declaration for TypeScript.
- `frontend/components/DebugPanel.tsx` – Contrast toggle button when flag + provider active.

## Enabling

1. Install dependencies:

   ```bash
   yarn add react-native-unistyles react-native-nitro-modules@0.31.10 react-native-edge-to-edge
   ```

1. (If using Expo prebuild/native modules) run:

   ```bash
   expo prebuild
   ```

1. Set flag in `frontend/constants/flags.ts`:

   ```ts
   enableUnistyles: true;
   ```

1. Reload the app. Debug panel will show a "Toggle Contrast Theme" button.

## Evaluation Metrics

| Metric               | Target                      | How                                            |
| -------------------- | --------------------------- | ---------------------------------------------- |
| Theme switch latency | < 5ms                       | Profiler / timestamp around toggleHighContrast |
| Re-render count      | No extra screen re-renders  | React DevTools profiler diff                   |
| Bundle size delta    | < +50kb gzipped             | Compare `expo export` stats                    |
| Memory overhead      | Negligible                  | Flipper / Hermes profile after 10 theme flips  |
| Error resilience     | No crashes when lib missing | Start with flag off                            |

## Rollback

Set `enableUnistyles` to `false` – provider becomes inert; no need to remove files.

## Next Steps (If Adopted)

1. Move shared tokens (colors/spacing) to Unistyles themes; remove duplicates in legacy styles.
2. Introduce semantic variants (e.g. `inventoryCritical`, `inventoryLow`).
3. Add accessibility theme (large font + high contrast) automatically when OS accessibility is detected.
4. Build small helper hook `useAppTheme()` to map to our tokens.
5. Gradually migrate high-traffic screens first (history, scan) under flag.

## Risks

- Native complexity during RN/Expo upgrades (Nitro modules). Mitigate with version pinning.
- Potential lint noise from dynamic import (currently suppressed until install).
- Additional CI step if nitro requires compilation.

## Decision Gate

Proceed to full adoption only if metrics show real gains and multi-tenant or accessibility theming requirements escalate.
