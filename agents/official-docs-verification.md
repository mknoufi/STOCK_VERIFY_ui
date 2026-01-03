# Official Documentation Verification Agent Knowledge

## Purpose
Define the knowledge base and task steps for an agent that verifies the codebase
against official framework documentation for the versions declared in this repo.

## Version Sources (Order of Trust)
1. `requirements.production.txt` (backend production versions)
2. `frontend/package.json` (frontend runtime versions)
3. `package.json` (workspace tooling versions)

If versions conflict across sources, the agent must flag the drift and choose the
most production-relevant source for verification.

## Framework Inventory (Official Docs + Versions)

### Frontend Runtime
| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| Expo SDK | `~54.0.29` | `frontend/package.json` | https://docs.expo.dev/versions/v54.0.0/ |
| React | `19.1.0` | `frontend/package.json` | https://react.dev/ |
| React Native | `0.81.5` | `frontend/package.json` | https://reactnative.dev/docs/0.81/getting-started |
| Expo Router | `~6.0.19` | `frontend/package.json` | https://docs.expo.dev/router/introduction/ |
| React Query (TanStack) | `^5.59.16` | `frontend/package.json` | https://tanstack.com/query/latest/docs/framework/react/overview |
| React Hook Form | `^7.68.0` | `frontend/package.json` | https://react-hook-form.com/ |
| Zod | `^4.2.1` | `frontend/package.json` | https://zod.dev/ |
| Zustand | `^5.0.9` | `frontend/package.json` | https://docs.pmnd.rs/zustand/getting-started/introduction |
| Sentry React Native | `~7.2.0` | `frontend/package.json` | https://docs.sentry.io/platforms/react-native/ |
| React Native Reanimated | `~4.1.1` | `frontend/package.json` | https://docs.swmansion.com/react-native-reanimated/ |
| React Native Gesture Handler | `~2.28.0` | `frontend/package.json` | https://docs.swmansion.com/react-native-gesture-handler/ |
| React Native Screens | `~4.16.0` | `frontend/package.json` | https://github.com/software-mansion/react-native-screens |
| React Native Safe Area Context | `~5.6.0` | `frontend/package.json` | https://github.com/th3rdwave/react-native-safe-area-context |
| React Native SVG | `15.12.1` | `frontend/package.json` | https://github.com/software-mansion/react-native-svg |
| React Native Web | `^0.21.0` | `frontend/package.json` | https://necolas.github.io/react-native-web/ |

### Backend Runtime
| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| FastAPI | `0.115.8` | `requirements.production.txt` | https://fastapi.tiangolo.com/ |
| Uvicorn | `0.34.1` | `requirements.production.txt` | https://www.uvicorn.org/ |
| Gunicorn | `23.0.0` | `requirements.production.txt` | https://docs.gunicorn.org/en/stable/ |
| Pydantic | `2.12.5` | `requirements.production.txt` | https://docs.pydantic.dev/2.12/ |
| Pydantic Settings | `2.7.0` | `requirements.production.txt` | https://docs.pydantic.dev/latest/concepts/pydantic_settings/ |
| Motor (MongoDB async) | `3.7.0` | `requirements.production.txt` | https://motor.readthedocs.io/en/stable/ |
| PyMongo | `>=4.10.0` | `requirements.production.txt` | https://pymongo.readthedocs.io/en/stable/ |
| Redis (redis-py) | `>=5.2.1` | `requirements.production.txt` | https://redis-py.readthedocs.io/en/stable/ |
| PyODBC | `5.2.0` | `requirements.production.txt` | https://github.com/mkleehammer/pyodbc/wiki |

### Tooling (If verifying build/test configs)
| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| NX | `22.3.3` | `package.json` | https://nx.dev/ |
| Jest | `~29.7.0` | `frontend/package.json` | https://jestjs.io/docs/getting-started |
| TypeScript | `^5.9.3` | `frontend/package.json` | https://www.typescriptlang.org/docs/ |
| ESLint | `^8.57.0` | `frontend/package.json` | https://eslint.org/docs/latest/ |
| Storybook | `^8.6.15` | `frontend/package.json` | https://storybook.js.org/docs/ |

## Task: Verify Codebase Against Official Docs
1. Build an import map for `frontend/` and `backend/` (framework modules and APIs).
2. For each imported framework/library, locate the official docs for the version
   listed in the inventory above.
3. Validate that each API usage, config key, and lifecycle hook matches the
   documented behavior for that version.
4. Flag any deprecated, removed, or undocumented usage. If the docs are not
   versioned, use the closest official docs and note that limitation.
5. Report version drift where code, lockfiles, or requirements disagree.

## Output Requirements (Agent)
- Summary: total files checked, total mismatches, version drift found.
- Findings list:
  - File path and line number (1-based).
  - API/config used and what is expected per official docs.
  - Documentation link (versioned if available).
  - Severity: `blocker`, `major`, `minor`.
- Unverified items: APIs or configs without clear official documentation or
  versioned docs.

## Notes
- Only official documentation sources are acceptable. Avoid blog posts or
  community guides unless no official docs exist (if used, mark as a gap).
- When a framework appears in multiple version sources, prefer the production
  version and document the discrepancy.
