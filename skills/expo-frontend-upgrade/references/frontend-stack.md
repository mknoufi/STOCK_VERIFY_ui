# Frontend Stack & Patterns

## Stack Snapshot
- Expo SDK 54 + React Native 0.81 + React 19; web via `react-native-web`.
- Routing: `expo-router` v6. Keep route params/types in sync when refactoring screens.
- Data/state: `@tanstack/react-query` v5 for server data; Zustand stores under `frontend/src/store`; forms with `react-hook-form` + Zod.
- UI deps: `@expo/vector-icons`, `expo-linear-gradient`, `expo-blur`, `FlashList` for lists.

## Theming & Styles (re-use, don't ad-hoc)
- Theme provider/hook: `frontend/src/theme/ThemeContext.tsx` (`ThemeProvider`, `useTheme/useThemeContext`). Supports multiple themes, patterns, layout arrangements, dynamic font size/primary color. Avoid bypassing the provider.
- Tokens: `frontend/src/theme/designTokens.ts` (colors, spacing, typography, radius, shadows); `frontend/src/theme/designSystem.ts` (Premium theme preset).
- Global styles: `frontend/src/styles/globalStyles.ts` (colors/gradients/spacing/typography); `frontend/src/styles/modernDesignSystem.ts` for richer palettes and depth helpers.
- When styling components:
  - Prefer `useTheme()` values (`theme.colors`, `theme.typography`, `theme.layout`) or `globalStyles` tokens.
  - Reuse shared containers/cards/screen styles in `frontend/src/styles` (e.g., `screenStyles.ts`, `screens/*`).
  - Keep spacing/typography on the provided scales; avoid magic numbers unless necessary.
  - For surfaces, lean on gradients/glass helpers instead of custom overlays.

## Performance & UX
- Lists: favor `FlashList` for long/virtualized content; set `estimatedItemSize`.
- Animations/transitions: prefer lightweight effects; ensure web compatibility.
- Accessibility: provide `accessibilityLabel`/`accessible` on touchables; maintain contrast using theme tokens; respect dynamic font sizing via theme.

## Dev Commands
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm test`
- Web run: `npm run web`
- Storybook (component spot checks): `npm run storybook`
