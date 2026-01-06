# Workspace Code Report

Generated: 2025-12-31 01:03:10
This report inventories the workspace and summarizes key entrypoints. A literal per-line commentary for the entire repository is not practical; instead, you get full-file coverage (inventory + stats) and deeper notes on the main runtime entrypoints.
## What This Repo Is
- Primary overview: `README.md`
- Canonical architecture memory: `docs/codebase_memory_v2.1.md`
## High-Level Architecture (Observed)
- Backend: FastAPI + Motor (MongoDB).
- ERP/SQL Server: treated as read-only source of truth (via connectors/APIs).
- Frontend: React Native (Expo) with an offline-first API layer and caching.
- Dynamic LAN configuration: backend writes `backend_port.json`, frontend reads it (per README).
## Workspace Scale
- Included files: **1374**
- Included LOC (approx, newline-based): **248142**
- Notes: build artifacts and caches are excluded (e.g., `.nx/`, `node_modules/`, virtualenvs).
## Breakdown by Top-Level Folder
| folder | files | loc | bytes |
|---|---|---|---|
| frontend | 624 | 111072 | 3040343 |
| backend | 307 | 68549 | 2336191 |
| docs | 120 | 37786 | 1008353 |
| scripts | 67 | 7327 | 237666 |
| specs | 33 | 5618 | 198838 |
| .github | 48 | 4614 | 164566 |
| ios | 79 | 3322 | 105342 |
| (root) | 38 | 2483 | 68094 |
| .specify | 11 | 2037 | 66539 |
| templates | 14 | 1900 | 88436 |
| .agent | 9 | 1849 | 53926 |
| agents | 5 | 901 | 28271 |
| .vscode | 6 | 154 | 3777 |
| .continue | 1 | 143 | 3933 |
| cooking_agent | 3 | 136 | 4328 |
| k8s | 3 | 105 | 2305 |
| skills | 2 | 60 | 4288 |
| .devcontainer | 1 | 59 | 1751 |
| .trunk | 1 | 17 | 438 |
| .husky | 1 | 9 | 160 |
| .frontmatter | 1 | 1 | 3 |

## Breakdown by File Type
| kind | files | loc | bytes |
|---|---|---|---|
| .py | 322 | 70265 | 2393985 |
| .tsx | 246 | 68884 | 1868646 |
| .md | 241 | 52586 | 1571575 |
| .ts | 215 | 31456 | 809537 |
| .json | 217 | 8875 | 276461 |
| .sh | 62 | 8055 | 264939 |
| .yml | 19 | 2698 | 78210 |
| .txt | 11 | 2037 | 61151 |
| .yaml | 14 | 1901 | 52117 |
| .js | 11 | 434 | 12324 |
| .sql | 3 | 242 | 6515 |
| .example | 5 | 230 | 8119 |
| Makefile | 1 | 205 | 6828 |
| .toml | 2 | 179 | 4378 |
| Dockerfile | 2 | 44 | 1046 |
| .ini | 1 | 29 | 753 |
| .env | 2 | 22 | 964 |

## Largest Files (by LOC)
| loc | bytes | kind | path |
|---|---|---|---|
| 2992 | 85183 | .ts | frontend/src/services/api/api.ts |
| 2353 | 87016 | .py | backend/server.py |
| 1994 | 45287 | .md | docs/archive/old_docs/COMPREHENSIVE_TODO_PLAN.md |
| 1904 | 57072 | .tsx | frontend/app/staff/scan.tsx |
| 1806 | 35341 | .ts | frontend/src/styles/scanStyles.ts |
| 1587 | 49038 | .tsx | frontend/app/staff/item-detail.tsx |
| 1479 | 51107 | .py | backend/api/legacy_routes.py |
| 1413 | 40939 | .tsx | frontend/app/staff/home.tsx |
| 1360 | 40274 | .tsx | frontend/app/admin/dashboard-web.tsx |
| 1250 | 38802 | .md | docs/archive/old_docs/CODEBASE_ANALYSIS.md |
| 1191 | 34398 | .tsx | frontend/app/admin/realtime-dashboard.tsx |
| 1088 | 33809 | .tsx | frontend/app/supervisor/error-logs.tsx |
| 1068 | 34482 | .tsx | frontend/app/supervisor/db-mapping.tsx |
| 1055 | 26351 | .md | docs/archive/old_docs/USER_MANUAL.md |
| 1016 | 28704 | .tsx | frontend/app/admin/control-panel.tsx |
| 980 | 20790 | .ts | frontend/src/styles/modernDesignSystem.ts |
| 952 | 29071 | .tsx | frontend/app/admin/metrics.tsx |
| 928 | 43122 | .md | docs/APP_LOGIC_OVERVIEW.md |
| 926 | 31097 | .py | backend/api/admin_control_api.py |
| 902 | 20664 | .md | docs/PRODUCTION_DEPLOYMENT_GUIDE.md |
| 880 | 19059 | .md | docs/archive/old_docs/DEPLOYMENT_GUIDE.md |
| 871 | 30131 | .tsx | frontend/app/login.tsx |
| 854 | 31855 | .py | backend/core/lifespan.py |
| 841 | 25205 | .tsx | frontend/app/supervisor/session/[id].tsx |
| 837 | 21312 | .tsx | frontend/src/components/admin/ErrorLogsPanel.tsx |
| 832 | 37735 | .py | backend/scripts/generate_api_docs.py |
| 831 | 26179 | .tsx | frontend/app/supervisor/sync-conflicts.tsx |
| 829 | 19235 | .md | docs/FEATURE_ROADMAP.md |
| 827 | 28806 | .py | backend/api/auth.py |
| 822 | 18839 | .md | docs/archive/old_docs/API_REFERENCE.md |

## Backend Entrypoints
- FastAPI app wiring: `backend/main.py`

### Routers registered in `backend/main.py` (extracted)
- `app.include_router(health_router)`
- `app.include_router(health_router, prefix="/api")`
- `app.include_router(info_router)`
- `app.include_router(permissions_router, prefix="/api")`
- `app.include_router(mapping_router)`
- `app.include_router(exports_router, prefix="/api")`
- `app.include_router(auth_router, prefix="/api")`
- `app.include_router(items_router)`
- `app.include_router(metrics_router, prefix="/api")`
- `app.include_router(sync_router, prefix="/api")`
- `app.include_router(sync_management_router, prefix="/api")`
- `app.include_router(self_diagnosis_router)`
- `app.include_router(security_router)`
- `app.include_router(verification_router)`
- `app.include_router(erp_router, prefix="/api")`
- `app.include_router(variance_router, prefix="/api")`
- `app.include_router(admin_control_router)`
- `app.include_router(dynamic_fields_router)`
- `app.include_router(dynamic_reports_router)`
- `app.include_router(logs_router, prefix="/api")`
- `app.include_router(sync_batch_router)`
- `app.include_router(rack_router)`
- `app.include_router(session_mgmt_router)`
- `app.include_router(reporting_router)`
- `app.include_router(admin_dashboard_router, prefix="/api")`
- `app.include_router(report_generation_router, prefix="/api")`
- `app.include_router(sync_conflicts_router, prefix="/api")`
- `app.include_router(auth.router, prefix="/api", tags=["Authentication"])`
- `app.include_router(supervisor_pin.router, prefix="/api", tags=["Supervisor"])`
- `app.include_router(api_router, prefix="/api")`

- Server legacy/compat entry: `backend/server.py` (large; contains wiring, services, legacy routes)

## Frontend Entrypoints
- API service layer: `frontend/src/services/api/api.ts` (offline-first, cache + retry)

### Exported API functions (extracted)
- `isOnline()`
- `createSession()`
- `getSessions()`
- `getSession()`
- `getRackProgress()`
- `bulkCloseSessions()`
- `bulkReconcileSessions()`
- `bulkExportSessions()`
- `getSessionsAnalytics()`
- `getItemByBarcode()`
- `searchItems()`
- `searchItemsOptimized()`
- `getSearchSuggestions()`
- `getSearchFilters()`
- `searchItemsSemantic()`
- `getRiskPredictions()`
- `identifyItem()`
- `createCountLine()`
- `getCountLines()`
- `checkItemCounted()`
- `addQuantityToCountLine()`
- `getVarianceReasons()`
- `approveCountLine()`
- `rejectCountLine()`
- `updateSessionStatus()`
- `createUnknownItem()`
- `registerUser()`
- `refreshItemStock()`
- `getAvailableTables()`
- `getTableColumns()`
- `getCurrentMapping()`
- `testMapping()`
- `saveMapping()`
- `syncOfflineQueue()`
- `getActivityLogs()`
- `verifyPin()`
- `deleteCountLine()`
- `getActivityStats()`
- `getErrorLogs()`
- `getErrorStats()`
- `getErrorDetail()`
- `resolveError()`
- `clearErrorLogs()`
- `getERPConfig()`
- `verifyStock()`
- `unverifyStock()`
- `getServicesStatus()`
- `startService()`
- `stopService()`
- `getSystemIssues()`
- `getSystemHealthScore()`
- `getSystemStats()`
- `getLoginDevices()`
- `getServiceLogs()`
- `getAvailablePermissions()`
- `getRolePermissions()`
- `getUserPermissions()`
- `addUserPermissions()`
- `removeUserPermissions()`
- `getExportSchedules()`
- `getExportSchedule()`
- `createExportSchedule()`
- `updateExportSchedule()`
- `deleteExportSchedule()`
- `triggerExportSchedule()`
- `getExportResults()`
- `downloadExportResult()`
- `getSyncConflicts()`
- `getSyncConflictDetail()`
- `resolveSyncConflict()`
- `batchResolveSyncConflicts()`
- `getSyncConflictStats()`
- `getMetrics()`
- `getMetricsHealth()`
- `checkHealth()`
- `getMetricsStats()`
- `getSyncStatus()`
- `getSyncStats()`
- `triggerManualSync()`
- `getAvailableReports()`
- `generateReport()`
- `getSqlServerConfig()`
- `updateSqlServerConfig()`
- `testSqlServerConnection()`
- `getSecuritySummary()`
- `getFailedLogins()`
- `getSuspiciousActivity()`
- `getSecuritySessions()`
- `getSecurityAuditLog()`
- `getIpTracking()`
- `clearServiceLogs()`
- `getSQLStatus()`
- `testSQLConnection()`
- `configureSQLConnection()`
- `getSQLConnectionHistory()`
- `getSystemParameters()`
- `updateSystemParameters()`
- `getSettingsCategories()`
- `resetSettingsToDefaults()`
- `getSystemSettings()`
- `updateSystemSettings()`
- `sessionsApi()`
- `countLineApi()`
- `itemsApi()`
- `mappingApi()`
- `exportsApi()`
- `syncApi()`
- `metricsApi()`
- `adminControlApi()`
- `reportsApi()`
- `sqlServerApi()`
- `securityApi()`
- `settingsApi()`
- `getVarianceTrend()`
- `getStaffPerformance()`
- `getFieldDefinitions()`
- `createFieldDefinition()`
- `updateFieldDefinition()`
- `deleteFieldDefinition()`
- `setFieldValue()`
- (truncated; total exports detected: 131)

## Full Inventory
A complete per-file inventory is written to `docs/WORKSPACE_CODE_INVENTORY.csv` (path, kind, bytes, loc).

## How to Regenerate
- Run: `python scripts/generate_workspace_code_report.py`
