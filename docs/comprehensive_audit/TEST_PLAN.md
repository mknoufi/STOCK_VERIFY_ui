# Test Plan

## 1. Unit Tests (Backend)

**Tool**: `pytest`
**Coverage Target**: 80%

### Critical Paths

* **Auth**: `backend/tests/test_auth.py` - Verify JWT generation, validation, and expiration.
* **Barcode Validation**: `backend/tests/test_barcode_validation.py` - Test 51/52/53 prefixes, length, and non-numeric inputs.
* **ERP Mapping**: `backend/tests/test_erp_mapping.py` - Verify schema mapping logic.

### Gaps

* **Sync Logic**: Add tests for `AutoSyncManager` edge cases (network failure, partial sync).
* **Rate Limiter**: Verify `RateLimiter` correctly blocks requests.

## 2. Integration Tests

**Tool**: `pytest` (with Docker services)

### Scenarios

* **API ↔ MongoDB**: Verify CRUD operations on `items` and `sessions`.
* **API ↔ SQL Server**: Verify read-only queries (mocked or against test DB).
* **Sync Job**: Trigger sync and verify MongoDB is updated from SQL Server source.

## 3. End-to-End (E2E) Tests

**Tool**: `Maestro` or `Detox` (Mobile), `Playwright` (Web)

### User Journeys

1. **Login**: User logs in with valid credentials -> Receives Token.
2. **Scan Item**: User scans valid barcode -> App displays item details from local DB/API.
3. **Count Item**: User enters quantity -> App saves to offline queue -> Syncs to backend.
4. **Supervisor Override**: User requests override -> Supervisor enters PIN -> Action approved.

## 4. Security Tests

**Tool**: `OWASP ZAP` / Custom Scripts

### Payloads

* **SQLi**: Inject `' OR 1=1 --` into barcode search field.
* **XSS**: Inject `<script>` into item notes (if displayed in Web UI).
* **Auth Bypass**: Attempt to access `/api/admin/*` without Supervisor token.
