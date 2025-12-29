# Implementation Plan: Comprehensive App Improvements

**Branch**: `002-system-modernization-and-enhancements` | **Date**: 2025-12-25 | **Spec**: [specs/002-system-modernization-and-enhancements/spec.md](../spec.md)
**Input**: Feature specification from `/specs/002-system-modernization-and-enhancements/spec.md`

## Summary

This plan covers the comprehensive modernization of the Stock Verify system, including:
1.  **Real-time Updates**: WebSocket integration for live stock counts.
2.  **Enhanced Security**: PIN-based quick login and improved session management.
3.  **UI/UX Improvements**: Theme support, font scaling, and better search.
4.  **Configuration Cleanup**: Consolidation of environment variables.

## Technical Context

**Language/Version**: Python 3.10+ (Backend), TypeScript 5.0+ (Frontend)
**Primary Dependencies**: FastAPI, React Native (Expo), MongoDB, SQL Server (pyodbc)
**Storage**: MongoDB (Primary), SQL Server (Read-only ERP), Redis (Optional Cache)
**Testing**: pytest (Backend), Jest (Frontend)
**Target Platform**: Docker (Backend), iOS/Android (Frontend)
**Project Type**: Mobile + API
**Performance Goals**: <200ms API response, <100ms search latency
**Constraints**: Offline-first capability for scanning, strict ERP data validation

## Constitution Check

*GATE: Passed.*
- **I. Stability First**: No breaking changes to existing ERP integration. API extensions are additive.
- **II. Verification Mandatory**: All new features (WebSocket, Auth, Preferences) will have dedicated test suites (pytest/Jest) with >90% coverage required before merge.
- **III. SQL Server Read-Only**: Enhanced item search respects read-only access to SQL Server; no writes to ERP tables.
- **IV. No AI Guessing**: Implementation relies on existing `backend/api/mapping_api.py` patterns and `docs/codebase_memory_v2.1.md`.
- **V. Unified Documentation**: `docs/codebase_memory_v2.1.md` will be updated with new models (UserPreferences) and API endpoints.

## Project Structure

### Documentation (this feature)

```text
specs/002-system-modernization-and-enhancements/
├── plan.md              # This file
├── research.md          # Technology decisions & .env strategy
├── data-model.md        # New entities (UserPreferences, ItemLock)
├── quickstart.md        # Developer setup guide
├── contracts/           # API specifications
│   └── api.yaml
└── tasks.md             # (To be created in Phase 2)
```

### Source Code

```text
backend/
├── api/
│   ├── enhanced_item_api.py  # V2 Item API
│   └── websocket_api.py      # New WebSocket endpoints
├── models/
│   └── preferences.py        # UserPreferences model
├── services/
│   └── websocket_service.py  # Connection manager
└── .env                      # Consolidated config

frontend/
├── src/
│   ├── context/
│   │   └── ThemeContext.tsx  # Theme provider
│   ├── services/
│   │   └── websocket.ts      # WebSocket client
│   └── screens/
│       └── SettingsScreen.tsx
└── .env                      # Frontend config
```

**Structure Decision**: Standard Mobile + API structure, extending existing directories.
