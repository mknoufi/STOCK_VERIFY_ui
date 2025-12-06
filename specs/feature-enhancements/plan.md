# Implementation Plan: Feature Enhancements

**Branch**: `feature/session-barcode-ui` | **Date**: 2023-10-27 | **Spec**: N/A
**Input**: User request for Session Floor/Rack, Barcode Logic, and Condition Toggle.

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement three key enhancements:
1.  **Session Scope**: Move Floor and Rack selection to the Session creation phase, persisting them as separate fields.
2.  **Barcode Logic**: Enhance item lookup to support "Manual Barcode -> Autobarcode -> PLU Code" priority/fallback.
3.  **UI Improvements**: Replace Condition input with a Toggle Switch in the scanning screen.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript/React Native (Frontend)
**Primary Dependencies**: FastAPI, Motor (MongoDB), Expo
**Storage**: MongoDB
**Testing**: pytest, manual UI testing
**Target Platform**: Mobile (Android/iOS) via Expo
**Project Type**: Full Stack (FastAPI + React Native)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Backward compatibility maintained
- [x] No breaking API changes without versioning (using existing endpoints with additive fields)

## Project Structure

### Documentation (this feature)

```text
specs/feature-enhancements/
├── plan.md              # This file
```

### Source Code (repository root)

-   `backend/api/schemas.py`: Update `SessionCreate` and `Session` models.
-   `backend/api/session_api.py`: Update `create_session` to handle `floor` and `rack`.
-   `backend/api/erp_api.py`: Update `get_item_by_barcode` to search multiple fields.
-   `backfron/src/services/api/api.ts`: Update `createSession` signature.
-   `backfron/app/staff/home.tsx`: Add Floor/Rack selection UI.
-   `backfron/app/staff/scan.tsx`: Add Condition Toggle UI.

## Tasks

1.  **Backend - Schemas**: Add `floor` and `rack` to `Session` and `SessionCreate` schemas in `backend/api/schemas.py`.
2.  **Backend - Session API**: Update `create_session` in `backend/api/session_api.py` to extract and save `floor` and `rack`.
3.  **Backend - Barcode Search**: Update `get_item_by_barcode` in `backend/api/erp_api.py` (and `enhanced_item_api.py` if used) to search using `$or` on `barcode`, `manual_barcode`, `auto_barcode`, `plu_code`.
4.  **Frontend - API Service**: Update `createSession` in `backfron/src/services/api/api.ts` to accept `floor` and `rack` arguments.
5.  **Frontend - Home Screen**: Refactor `backfron/app/staff/home.tsx` to allow selecting Floor and Rack separately and passing them to `createSession`.
6.  **Frontend - Scan Screen**: Refactor `backfron/app/staff/scan.tsx` to replace the condition input with a toggle switch (Good/Damaged).
