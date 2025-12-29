# Contracts: Existing APIs (Documentation Map)

This is not a new API design; it’s a map from user actions to existing endpoints so documentation stays grounded in the running system.

## Auth

- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Current user (common pattern): `GET /api/auth/me` (if present in auth router)
- Protected routes: Most app routes require `Authorization: Bearer <token>` via auth dependencies.

Notes:
- Response shapes are not consistently wrapped in a `{success,data,...}` envelope across all endpoints.

## Sessions

User actions:
- Create a session
- View my sessions
- View active sessions
- Get session details

Endpoints:
- `GET /api/sessions` (paginated list)
- `POST /api/sessions` (create)
- `GET /api/sessions/active`
- `GET /api/sessions/{session_id}` (if implemented)

## Item Lookup & Verification

User actions:
- Lookup item by barcode/code
- Mark item verified/unverified
- Update master / verification metadata
- Export / filtered views

Endpoints (ERP v2):
- `GET /api/v2/erp/items/barcode/{barcode}/enhanced`
- `GET /api/v2/erp/items/search/advanced`

Endpoints (Verification under same prefix):
- `PATCH /api/v2/erp/items/{item_code}/verify`
- `PATCH /api/v2/erp/items/{item_code}/update-master`
- `GET /api/v2/erp/items/variances`
- `GET /api/v2/erp/items/export/csv`

## Count Lines

User actions:
- Add count line
- Validate variance and provide correction reason
- Supervisor review (if enabled)

Primary write path in offline mode:
- `POST /api/sync/batch` (can create `count_lines` and verification records from offline payloads)

Other count-line analytics/read paths exist in v2 and reporting modules.

## Offline Sync

User actions:
- Sync queued device actions
- Heartbeat / presence updates
- Detect conflicts (duplicate serials, rack locks, invalid quantities)

Endpoints:
- `POST /api/sync/batch`
- `POST /api/sync/heartbeat`
- `GET /api/sync-conflicts/*` (conflict management features)

## Reports

User actions:
- Preview query
- Create/list snapshots
- Export snapshot data
- Compare snapshots

Endpoints:
- `POST /api/reports/query/preview`
- `POST /api/reports/snapshots`
- `GET /api/reports/snapshots`
- `GET /api/reports/snapshots/{snapshot_id}`
- `GET /api/reports/snapshots/{snapshot_id}/export`
- `POST /api/reports/compare`
- `GET /api/reports/compare/{job_id}`

---

## Compatibility Notes

### Overlapping/Dual Endpoints

| Endpoint Group | Primary | Legacy/Alternative | Notes |
|----------------|---------|-------------------|-------|
| Sessions | `session_management_api.py` `/api/sessions/*` | `session_api.py` `/api/sessions/*` | Both active; management API preferred |
| Item lookup | `enhanced_item_api.py` `/api/v2/erp/items/*` | `erp_api.py` `/api/erp/items/*` | V2 has caching |
| Sync | `sync_batch_api.py` `/api/sync/batch` | `sync_api.py` `/api/sync/*` | Batch API is primary |
| Health | `/health/*` | `/api/health/*` | Dual-mounted; prefer `/health` for probes |

### Response Envelope Variations

| Endpoint | Response Shape |
|----------|---------------|
| `POST /api/auth/login` | `TokenResponse` (direct model) |
| `GET /api/sessions` | `list[SessionDetail]` or `PaginatedResponse` |
| `POST /api/sync/batch` | `{success, results[], conflicts[], errors[]}` |
| Most list endpoints | `PaginatedResponse[T]` |

### Legacy Payload Support

| Feature | Legacy Format | Current Format | Status |
|---------|---------------|----------------|--------|
| Sync batch | `operations: [...]` | `records: [...]` | Both accepted |
| Session status | `RECONCILE` | `ACTIVE` | Auto-converted |

## Notes / TODO

- Keep this file as a stable index; put the deep explanations in the narrative doc.
- If you want a frontend-centric map (screen → API call), add it here as a separate section so the backend map stays stable.
