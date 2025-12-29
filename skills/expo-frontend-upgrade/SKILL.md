---
name: expo-frontend-upgrade
description: Modernize and restyle the Expo/React Native frontend (React 19, RN 0.81, expo-router) while keeping flows working. Use for UI refreshes, design-token alignment, accessibility/UX polish, performance/responsiveness tuning, and component refactors across mobile and web.
---

# Expo Frontend Upgrade

## Overview

Upgrade and restyle the Expo + React Native app with consistent design-token usage, safer refactors, and dual mobile/web support. Follow the workflow below and the repo-specific notes in `references/frontend-stack.md`.

## Quick Start Workflow

1) Clarify the target screen/flow and success criteria (visual tone, UX fixes, platform targets).
2) Inspect existing implementation (component, route, store) and note current styling hooks (ThemeContext, globalStyles, designTokens).
3) Draft a small plan: data/state changes, layout/styling updates, validation/a11y, and test touchpoints.
4) Implement with safe increments; lean on theme tokens and shared styles instead of ad-hoc values.
5) Validate: run lint/typecheck/tests, and spot-check in Expo (mobile + web) or Storybook when feasible.

## Implementation Notes

- **Theming & tokens**: Use `ThemeProvider`/`useTheme` from `frontend/src/theme/ThemeContext.tsx` and tokens from `frontend/src/theme/designTokens.ts` or `styles/globalStyles.ts`. Avoid hard-coded colors; reuse spacing/typography scales.
- **Layouts & surfaces**: Prefer existing card/container patterns (e.g., `screenStyles`, `modernDesignSystem`) and gradients/glass helpers for depth instead of custom inline styles.
- **Forms & data**: Keep React Query cache keys and Zustand stores intact; when altering form UI, preserve validation with `react-hook-form` and Zod schemas.
- **Navigation**: Respect `expo-router` conventions; update route params/types when changing screens.
- **Performance/responsiveness**: For long lists, favor `FlashList`; defer heavy work to effects; verify web compatibility (hover states optional, but no RN-only props on DOM).
- **Validation & QA**: Run `npm run lint`, `npm run typecheck`, and `npm test` after changes. For visual work, sanity-check in Expo Go/web and (optionally) `npm run storybook`.

## References

- `references/frontend-stack.md`: Stack summary, theming/styling entry points, common commands.
