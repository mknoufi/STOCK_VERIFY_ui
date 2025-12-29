# Quickstart: App Logic Documentation

## Purpose

This spec produces an "App Logic Overview" that explains how the Stock Verification System behaves end-to-end (startup → auth → core workflows), grounded in the actual FastAPI routes and MongoDB collections.

## Where to Read

- Primary output: docs/APP_LOGIC_OVERVIEW.md (long-lived overview)
- Spec: `specs/004-app-logic-docs/spec.md`
- Plan: `specs/004-app-logic-docs/plan.md`
- Research: `specs/004-app-logic-docs/research.md`
- Data model: `specs/004-app-logic-docs/data-model.md`
- API map: `specs/004-app-logic-docs/contracts/existing-apis.md`

## How to Validate Docs Against the Running App

- Start backend:
  - `cd backend && export PYTHONPATH=.. && uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload`
- Open API docs:
  - `http://localhost:8001/api/docs`

Validation checklist:
- Use docs/APP_LOGIC_OVERVIEW.md as the reference; confirm each section matches the OpenAPI surface.
- Confirm documented route paths match OpenAPI.
- Confirm documented collections match Mongo usage in code.
- Confirm auth requirements (JWT) match dependencies.

Reality check:
- Some endpoints return unwrapped Pydantic models (not the `{success,data,...}` envelope described in `docs/API_CONTRACTS.md`). Document *current behavior* and treat the contract doc as a standard/goal.

## Scope Reminder

This work should not change production behavior. The deliverable is documentation and a clear map of behavior.

## T010 Prerequisites Check Output (2025-12-29)

```json
{
  "FEATURE_DIR": "/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped/specs/004-app-logic-docs",
  "AVAILABLE_DOCS": ["research.md", "data-model.md", "contracts/", "quickstart.md", "tasks.md"]
}
```

All prerequisite files are in place. Ready to proceed with user story documentation.
