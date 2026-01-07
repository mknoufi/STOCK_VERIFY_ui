# Tasks: Comprehensive App Improvements

**Spec**: [specs/002-system-modernization-and-enhancements/spec.md](./spec.md)
**Status**: In Progress

## Phase 0: Critical Fixes (Prerequisites)
- [x] **[Fix]** Fix Worklets/Reanimated runtime mismatch in `frontend/package.json`. <!-- id: 0 -->
- [x] **[Fix]** Fix "missing default export" errors in Expo Router pages (approx 30 files). <!-- id: 1 -->
- [x] **[Fix]** Ensure `frontend/babel.config.js` has Reanimated plugin last. <!-- id: 2 -->

## Phase 1: Configuration & Infrastructure
- [x] **[Config]** Update `backend/config.py` to strictly load `backend/.env`. <!-- id: 3 -->
- [x] **[Config]** Update `docker-compose.yml` to load `backend/.env` and `backend/.env.docker`. <!-- id: 4 -->
- [x] **[Docs]** Update `STARTUP_GUIDE.md` with new environment setup instructions. <!-- id: 5 -->

## Phase 2: Backend: Real-time & Auth
- [x] **[WebSocket]** Create `backend/services/websocket_service.py` (ConnectionManager). <!-- id: 6 -->
- [x] **[Test]** Add unit tests for `websocket_service.py`. <!-- id: 21 -->
- [x] **[WebSocket]** Create `backend/api/websocket_api.py` endpoints. <!-- id: 7 -->
- [x] **[Test]** Add integration tests for WebSocket endpoints. <!-- id: 22 -->
- [x] **[Auth]** Update `User` model with `pin_hash`. <!-- id: 8 -->
- [x] **[Auth]** Implement `POST /api/auth/pin/change` endpoint. <!-- id: 9 -->
- [x] **[Auth]** Implement `POST /api/auth/login/pin` endpoint. <!-- id: 10 -->
- [x] **[Test]** Add tests for PIN change and login flows. <!-- id: 23 -->

## Phase 3: Backend: User Preferences & Items
- [x] **[Model]** Create `UserPreferences` model in `backend/models/preferences.py`. <!-- id: 11 -->
- [x] **[API]** Implement `PUT /api/users/me/preferences` endpoint. <!-- id: 12 -->
- [x] **[Test]** Add tests for UserPreferences CRUD. <!-- id: 24 -->
- [x] **[API]** Create `backend/api/enhanced_item_api.py` with optimized search. <!-- id: 13 -->
- [ ] **[Test]** Add performance/load tests for enhanced item search. <!-- id: 25 -->

## Phase 4: Frontend: Core & Settings
- [ ] **[Context]** Create `frontend/src/context/ThemeContext.tsx`. <!-- id: 14 -->
- [ ] **[Test]** Add unit tests for ThemeContext. <!-- id: 26 -->
- [ ] **[Service]** Create `frontend/src/services/websocket.ts` client. <!-- id: 15 -->
- [ ] **[UI]** Create `SettingsScreen.tsx` with Theme and Font controls. <!-- id: 16 -->
- [ ] **[UI]** Integrate `UserPreferences` API with Settings screen. <!-- id: 17 -->

## Phase 5: Offline Support
- [ ] **[Lib]** Setup local database (expo-sqlite) in `frontend/src/services/offline/db.ts`. <!-- id: 18 -->
- [ ] **[Service]** Implement `SyncQueueService` for offline mutations. <!-- id: 19 -->
- [ ] **[UI]** Add Offline Mode indicator and Sync status UI. <!-- id: 20 -->
- [ ] **[Test]** Add tests for offline storage and sync logic. <!-- id: 27 -->

## Phase 6: Analytics & Reporting
- [ ] **[API]** Create `backend/api/analytics_api.py` endpoints. <!-- id: 31 -->
- [ ] **[Service]** Implement `backend/services/analytics_service.py` (Variance/Accuracy). <!-- id: 32 -->
- [ ] **[UI]** Create `AnalyticsDashboard` screen in frontend. <!-- id: 33 -->
- [ ] **[Test]** Add tests for analytics service. <!-- id: 34 -->

## Phase 7: Polish & Documentation
- [ ] **[Docs]** Update `docs/codebase_memory_v2.1.md` with new models and API endpoints. <!-- id: 28 -->
- [ ] **[Docs]** Update `CHANGELOG.md`. <!-- id: 29 -->
- [ ] **[Verify]** Run full regression test suite. <!-- id: 30 -->
