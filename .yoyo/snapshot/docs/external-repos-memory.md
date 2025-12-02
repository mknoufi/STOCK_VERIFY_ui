# External Repos — Useful Memory for This App

This document captures actionable takeaways from four external repositories and how they can enhance our Expo React Native + FastAPI + MongoDB/SQL project. Each section includes fit assessment, concrete integration ideas, and guardrails aligned with our architecture.

 
## GibsonAI/Memori

- Purpose: Memory-centric patterns (user/context "memories", retrieval).
- Fit: Medium — valuable if we add a lightweight "User Notes & Memory" feature for supervisors/staff.
- Use in our app:
  - Data model in MongoDB: `notes` collection keyed by `tenantId`, `userId`, `{ createdAt, tags, body }`.
  - Search: Start with `Fuse.js` fuzzy search (already in dependencies); consider embeddings later if needed.
  - Offline: Integrate with `frontend/services/offlineQueue.ts` so notes enqueue offline and flush on reconnect.
  - UI: Flag-gated notes panel under supervisor/staff routes; lazy-loaded.
- Guardrails: Keep ERP writes in Mongo; enforce JWT (`Depends(get_current_user)`); follow `API_CONTRACTS.md` error shape.

 
## justjavac/free-programming-books-zh_CN

- Purpose: Curated Chinese-language programming resource links.
- Fit: Low — not core functionality; useful as an optional in-app help resource.
- Use in our app:
  - Add a simple Help screen that links externally to curated lists (fetch on demand; do not bundle content).
  - Provide localized help entry points; keep it out of production build unless enabled via flag.
- Guardrails: Avoid large static bundles; respect licensing; link rather than mirror.

 
## storybookjs/storybook

- Purpose: Component playground, visual regression, and UI documentation.
- Fit: High — accelerates iteration and QA for our components (BottomSheet, Skeleton, SwipeableRow, badges).
- Use in our app:
  - Dev-only Storybook setup for RN/Expo in `storybook/`.
  - Add stories for: `components/ui/BottomSheet`, `components/LoadingSkeleton` (Skeleton/SkeletonList), `components/SwipeableRow`, `components/DebugPanel`, `components/NetworkStatusBanner`, supervisor dashboard quick actions with offline badge.
  - Use snapshots and visual checks in CI; ensure Storybook code is excluded from production build.
- Guardrails: Keep strictly dev-only; ensure Expo compatibility; respect feature flags.

 
## enaqx/awesome-react

- Purpose: Curated ecosystem references (performance, testing, accessibility, patterns).
- Fit: Medium — reference to refine best practices.
- Use in our app:
  - Performance: Validate virtualization, memoization, and animation patterns for RN/Expo.
  - Testing: Strengthen Jest + Testing Library usage (we already mock AsyncStorage and fixed empty suites).
  - Accessibility: Ensure RN components use accessibility props and labels where relevant.
- Guardrails: Do not add libraries without a clear need; treat as ongoing reference.

 
## Immediate Recommendations

- Adopt Storybook (dev-only) to stabilize and iterate on UI components faster.
- Prototype a Memori-inspired "Notes" feature strictly in MongoDB, flag-gated, and offline-aware.
- Optional: Add a lightweight Help page linking to external learning resources (Chinese list and others).

 
## Feature Flags to Introduce

- `enableNotes`: Toggle the notes module and UI.
- `enableStorybook`: Dev-only flag to run Storybook without affecting production.
- `enableHelpResources`: Toggle the Help page that links to external resources.

 
## Quick Implementation Outline (Notes)

- Backend: Add `notes` router under `/api/notes` with JWT, CRUD in MongoDB.
- Frontend: Create `frontend/app/supervisor/notes.tsx` and `frontend/services/notesApi.ts`; integrate with `offlineQueue.ts` for POST/PUT/DELETE.
- Search: Use `Fuse.js` for local fuzzy search; pagination/filtering for large lists.

This memory should guide safe, incremental adoption aligned with our phased rollout and flag-gated strategy.
