# 🧪 Testing Guide - New Features Integration

**Date:** November 8, 2025
**Status:** ✅ Backend & Frontend Running
**Backend:** http://127.0.0.1:8000
**Frontend:** http://192.168.1.41:8081
**API Docs:** http://127.0.0.1:8000/docs

---

## ✅ System Status

### Backend Services Running:
- ✅ FastAPI Server (Port 8000)
- ✅ Scheduled Export Service
- ✅ Sync Conflicts Service
- ✅ Monitoring/Metrics Service
- ✅ Database Health Monitoring
- ✅ MongoDB Connection Pool
- ✅ SQL Server ERP Connection

### Frontend Running:
- ✅ Expo Development Server
- ✅ Metro Bundler
- ✅ Web, iOS, Android Available

---

## 📋 Testing Checklist

### 1. Authentication & Permissions Testing

#### Test 1.1: Login and Permission Loading
**Steps:**
1. Open the app (web: press `w` in Expo terminal)
2. Login with supervisor/admin credentials
3. **Verify:** User permissions are loaded (check console logs)
4. **Expected:** "Login successful: [username] with [X] permissions" in console

**Test Data:**
- Supervisor: `supervisor` / `password`
- Admin: `admin` / `password`

#### Test 1.2: Permission Hook Functionality
**Steps:**
1. Navigate to any new screen
2. Open browser console (F12)
3. Check that permission checks work
4. **Expected:** No permission errors, screens load correctly

---

### 2. Permissions Management Screen (`/admin/permissions`)

#### Test 2.1: View Available Permissions
**Steps:**
1. Login as admin user
2. Navigate to supervisor dashboard
3. Click "Permissions" button (pink key icon)
4. **Verify:** See all 32 permissions categorized
5. **Expected:** Categories like session, count_line, item, export, etc.

#### Test 2.2: Manage User Permissions
**Steps:**
1. On permissions screen, enter a username (e.g., "supervisor")
2. Click "Load" button
3. **Verify:** User's current permissions display
4. Click "Add" on a permission
5. **Expected:** Success message, permission added
6. Click "Remove" on a permission
7. **Expected:** Success message, permission removed

**API Endpoints Used:**
- `GET /api/permissions/available`
- `GET /api/permissions/users/{username}`
- `POST /api/permissions/users/{username}/add`
- `POST /api/permissions/users/{username}/remove`

---

### 3. Export Schedules Screen (`/supervisor/export-schedules`)

#### Test 3.1: View Existing Schedules
**Steps:**
1. Login as supervisor
2. Navigate to supervisor dashboard
3. Click "Schedules" button (purple calendar icon)
4. **Verify:** List of export schedules displays
5. **Expected:** Each schedule shows name, frequency, format, enabled status

#### Test 3.2: Create New Export Schedule
**Steps:**
1. On export schedules screen, click "+ New" button
2. Enter schedule details:
   - Name: "Daily Stock Export"
   - Description: "Export all stock data daily"
   - Frequency: "daily"
   - Format: "excel"
3. Click "Create"
4. **Expected:** Success message, schedule appears in list

#### Test 3.3: Edit Export Schedule
**Steps:**
1. Click "Edit" on any schedule
2. Change frequency to "weekly"
3. Click "Update"
4. **Expected:** Success message, schedule updated

#### Test 3.4: Trigger Export Now
**Steps:**
1. Click "Trigger Now" on any schedule
2. **Expected:** Success message
3. Navigate to Export Results to verify

#### Test 3.5: Delete Export Schedule
**Steps:**
1. Click "Delete" on any schedule
2. Confirm deletion
3. **Expected:** Schedule removed from list

**API Endpoints Used:**
- `GET /api/exports/schedules`
- `POST /api/exports/schedules`
- `PUT /api/exports/schedules/{id}`
- `DELETE /api/exports/schedules/{id}`
- `POST /api/exports/schedules/{id}/trigger`

---

### 4. Export Results Screen (`/supervisor/export-results`)

#### Test 4.1: View Export History
**Steps:**
1. Click "Results" button (cyan archive icon)
2. **Verify:** List of export results displays
3. **Expected:** Each result shows:
   - Schedule name
   - Status (completed/failed/pending)
   - Format, record count, file size
   - Start and completion time

#### Test 4.2: Filter by Status
**Steps:**
1. Click filter buttons: All, Completed, Failed, Pending
2. **Verify:** List updates based on filter
3. **Expected:** Only exports matching status show

#### Test 4.3: Download Export File
**Steps:**
1. Find a "completed" export
2. Click "⬇ Download" button
3. **Expected:** File downloads or share dialog opens

#### Test 4.4: View Error Details
**Steps:**
1. Find a "failed" export
2. **Verify:** Error message displays in red box
3. **Expected:** Clear error description shown

**API Endpoints Used:**
- `GET /api/exports/results`
- `GET /api/exports/results/{id}/download`

---

### 5. Sync Conflicts Screen (`/supervisor/sync-conflicts`)

#### Test 5.1: View Conflicts List
**Steps:**
1. Click "Conflicts" button (orange compare icon)
2. **Verify:** List of sync conflicts displays
3. **Expected:** Each conflict shows:
   - Item code
   - Conflict type
   - Local vs Server values
   - Detection timestamp

#### Test 5.2: View Conflict Statistics
**Steps:**
1. Check stats bar at top
2. **Verify:** Shows Total, Pending, Resolved counts
3. **Expected:** Numbers match actual conflicts

#### Test 5.3: Resolve Single Conflict
**Steps:**
1. Long-press on any conflict
2. Modal opens with details
3. Enter resolution note (optional)
4. Click "Accept Server" or "Accept Local"
5. **Expected:** Success message, conflict removed

#### Test 5.4: Batch Resolve Conflicts
**Steps:**
1. Tap multiple conflicts to select (checkbox appears)
2. Click "Accept Server" or "Accept Local" in batch actions
3. Confirm bulk resolution
4. **Expected:** All selected conflicts resolved

#### Test 5.5: Filter Conflicts
**Steps:**
1. Click "Pending", "Resolved", or "All" filters
2. **Verify:** List updates based on filter
3. **Expected:** Only matching conflicts show

**API Endpoints Used:**
- `GET /api/sync/conflicts`
- `GET /api/sync/conflicts/stats`
- `POST /api/sync/conflicts/{id}/resolve`
- `POST /api/sync/conflicts/batch-resolve`

---

### 6. Metrics Dashboard Screen (`/admin/metrics`)

#### Test 6.1: View System Health
**Steps:**
1. Login as admin
2. Click "Metrics" button (blue speedometer icon)
3. **Verify:** System health indicator shows
4. **Expected:** Green dot + "System Healthy" or issues detected

#### Test 6.2: View API Performance Metrics
**Steps:**
1. Check "API Performance" section
2. **Verify:** Shows:
   - Total Requests
   - Success Rate (%)
   - Avg Response Time (ms)
   - Error Count
3. **Expected:** Real-time data displays

#### Test 6.3: View User Activity
**Steps:**
1. Check "User Activity" section
2. **Verify:** Shows:
   - Active Users
   - Total Sessions
   - Active Sessions
3. **Expected:** Current activity data

#### Test 6.4: View Database Statistics
**Steps:**
1. Check "Database Statistics" section
2. **Verify:** Shows:
   - Total Count Lines
   - Pending Approvals
   - Total Items
   - Unknown Items
3. **Expected:** Database stats display

#### Test 6.5: Auto-Refresh
**Steps:**
1. Wait 30 seconds
2. **Verify:** Metrics update automatically
3. **Expected:** "Last updated" time refreshes

#### Test 6.6: Manual Refresh
**Steps:**
1. Click refresh button (↻)
2. **Expected:** Metrics reload immediately

**API Endpoints Used:**
- `GET /api/metrics/stats`
- `GET /api/metrics/health`

---

## 🔍 API Testing (Using Swagger UI)

### Access API Documentation:
1. Open browser: http://127.0.0.1:8000/docs
2. Click "Authorize" button
3. Enter JWT token (get from login)

### Test Each Endpoint Group:

#### Permissions API (7 endpoints)
- GET `/api/permissions/available`
- GET `/api/permissions/roles/{role}`
- GET `/api/permissions/users/{username}`
- POST `/api/permissions/users/{username}/add`
- POST `/api/permissions/users/{username}/remove`
- GET `/api/permissions/check/{permission}`
- GET `/api/permissions/roles`

#### Exports API (8 endpoints)
- GET `/api/exports/schedules`
- POST `/api/exports/schedules`
- GET `/api/exports/schedules/{schedule_id}`
- PUT `/api/exports/schedules/{schedule_id}`
- DELETE `/api/exports/schedules/{schedule_id}`
- POST `/api/exports/schedules/{schedule_id}/trigger`
- GET `/api/exports/results`
- GET `/api/exports/results/{result_id}/download`

#### Sync Conflicts API (5 endpoints)
- GET `/api/sync/conflicts`
- GET `/api/sync/conflicts/{conflict_id}`
- POST `/api/sync/conflicts/{conflict_id}/resolve`
- POST `/api/sync/conflicts/batch-resolve`
- GET `/api/sync/conflicts/stats`

#### Metrics API (3 endpoints)
- GET `/api/metrics`
- GET `/api/metrics/health`
- GET `/api/metrics/stats`

---

## ⚠️ Known Issues & Limitations

### TypeScript Warnings:
- Some routes show type errors (routes not in type definition yet)
- FileSystem API differences between React Native versions
- Minor lint warnings (unused variables, missing dependencies)
- **Impact:** None - these are development-time warnings only

### Feature Limitations:
1. **Export Downloads:** May need platform-specific handling
2. **File Sharing:** Requires Expo modules to be fully configured
3. **Push Notifications:** Not implemented for completed exports

### Browser Compatibility:
- ✅ Chrome/Edge (tested)
- ✅ Firefox (should work)
- ⚠️ Safari (may need polyfills for some features)

---

## 📊 Performance Testing

### Load Testing:
1. Create multiple export schedules
2. Trigger multiple exports simultaneously
3. Monitor server logs for performance
4. Check metrics dashboard for response times

### Concurrent User Testing:
1. Login from multiple browsers/devices
2. Perform operations simultaneously
3. Verify no conflicts or race conditions
4. Check database for data consistency

---

## 🐛 Debugging Tips

### Backend Issues:
```bash
# Check server logs
# Terminal running uvicorn shows all requests/errors

# Check MongoDB
mongo
use stock_verification
db.export_schedules.find()
db.export_results.find()
db.sync_conflicts.find()
```

### Frontend Issues:
```bash
# Clear Metro cache
npx expo start --clear

# Check browser console (F12)
# Look for API errors, permission issues

# Check network tab
# Verify API calls to http://localhost:8000/api
```

### Common Problems:

**Problem:** "Permission denied" on new screens
**Solution:** User account may not have updated permissions. Re-login or check permissions in admin panel.

**Problem:** API calls fail with 404
**Solution:** Ensure backend server is running and accessible at correct URL.

**Problem:** Export download doesn't work
**Solution:** Check browser download permissions, may need to use native file picker.

**Problem:** Metrics don't update
**Solution:** Refresh manually or check if background service is running.

---

## ✅ Success Criteria

### Integration is successful when:
- ✅ All 5 new screens load without errors
- ✅ Permission checks work correctly
- ✅ API calls succeed (check network tab)
- ✅ Data displays correctly in UI
- ✅ CRUD operations work (Create, Read, Update, Delete)
- ✅ Filters and search functionality work
- ✅ Navigation between screens works
- ✅ Role-based access control functions
- ✅ No JavaScript/TypeScript errors in console
- ✅ Backend services run without crashes

---

## 📈 Next Steps After Testing

### Phase 1: Bug Fixes (1-2 days)
- Fix any issues found during testing
- Address TypeScript errors
- Improve error handling
- Add loading states

### Phase 2: Enhancements (1 week)
- Add data visualization charts for metrics
- Implement push notifications for exports
- Add email notifications for conflicts
- Create export templates
- Improve mobile responsiveness

### Phase 3: Production Readiness (3-5 days)
- Security audit
- Performance optimization
- Database backup strategy
- Monitoring and alerting setup
- User documentation
- Admin training materials

### Phase 4: Deployment (1-2 days)
- Production environment setup
- Database migration
- User accounts creation
- Initial data seeding
- Go-live checklist

---

## 📞 Support & Resources

**Documentation:**
- Backend API: http://127.0.0.1:8000/docs
- Project README: See README.md
- Implementation Notes: See IMPLEMENTATION_COMPLETE.md

**Test Accounts:**
- Admin: `admin` / `password`
- Supervisor: `supervisor` / `password`
- Staff: `staff` / `password`

**Backend Logs:** Terminal running uvicorn
**Frontend Logs:** Browser console (F12) or Expo terminal

---

## 🎯 Testing Priority

**High Priority (Must Test First):**
1. ✅ Authentication with permission loading
2. ✅ Permissions management (admin only)
3. ✅ Export schedule creation and triggering
4. ✅ Export results viewing and downloading

**Medium Priority:**
5. ✅ Sync conflict resolution
6. ✅ Metrics dashboard functionality
7. ✅ Filter and search features
8. ✅ Batch operations

**Low Priority (Nice to Have):**
9. ✅ Auto-refresh functionality
10. ✅ Mobile responsiveness
11. ✅ Keyboard shortcuts
12. ✅ Performance under load

---

**Happy Testing! 🚀**

*If you encounter any issues not covered in this guide, check the terminal logs or browser console for detailed error messages.*
