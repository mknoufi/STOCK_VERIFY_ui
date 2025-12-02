#!/bin/bash
# Codebase Cleanup Script
# Safely removes backup, duplicate, and temporary files

set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"

echo "🧹 Starting codebase cleanup..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Create archive directory for old docs
mkdir -p archive/old_docs

# ==========================================
# HIGH PRIORITY - Safe to Delete
# ==========================================

echo "🔴 Removing backup and duplicate files..."

# Frontend backup files
rm -f frontend/app/*.backup
rm -f frontend/app/welcome.backup.tsx
rm -f frontend/app/_layout.original.backup
rm -f frontend/app/index.tsx.backup
rm -f frontend/app/_layout.tsx.backup

# Backend duplicate files
rm -f backend/server2.py
rm -f backend/test_modules.py
rm -f backend/test_server.py
rm -f backend/capture_login_error.py 2>/dev/null || true

# Unused utility (structured_logger.py is newer but unused, structured_logging.py is used)
rm -f backend/utils/structured_logger.py 2>/dev/null || true

# Root test files
rm -f test_modules.py
rm -f test_server.py
rm -f test_new_features.py

# Archive test files
if [ -d "backend/tests/archive" ]; then
    echo "  Removing archive test files..."
    rm -rf backend/tests/archive/
fi

# Log files
echo "🔴 Removing log files..."
rm -f *.log
rm -f backend*.log
rm -f debug.log
rm -f frontend/*.log
rm -f TEST_OUTPUT.txt
rm -f query 2>/dev/null || true

echo "✅ High priority cleanup complete!"
echo ""

# ==========================================
# MEDIUM PRIORITY - Review Before Deleting
# ==========================================

echo "🟡 Review these files before deleting:"
echo "  • 2777.png"
echo "  • lavanya_emart_logo_page_2.png"
echo "  • WhatsApp Image 2025-11-05 at 23.09.38_1b1c8b07.jpg"
echo "  • LAVANYA E MART LOGO BOOK.pdf"
echo ""
echo "  Check if these are used in the app before removing."
echo ""

# ==========================================
# LOW PRIORITY - Archive Old Documentation
# ==========================================

echo "🟢 Archiving old documentation files..."

# Status files
mv ALL_12_TODOS_DONE.md archive/old_docs/ 2>/dev/null || true
mv ALL_SERVICES_STOPPED.md archive/old_docs/ 2>/dev/null || true
mv APP_FULLY_RESTARTED.md archive/old_docs/ 2>/dev/null || true
mv APP_RESTARTED.md archive/old_docs/ 2>/dev/null || true
mv APP_SUCCESSFULLY_RESTARTED.md archive/old_docs/ 2>/dev/null || true
mv BACKEND_RUNNING.md archive/old_docs/ 2>/dev/null || true
mv BACKEND_START_STATUS.md archive/old_docs/ 2>/dev/null || true
mv BACKEND_STATUS.md archive/old_docs/ 2>/dev/null || true
mv BACKEND_URL_FIXED_FINAL.md archive/old_docs/ 2>/dev/null || true
mv EXPO_FIX_COMPLETE.md archive/old_docs/ 2>/dev/null || true
mv EXPO_RESTARTED.md archive/old_docs/ 2>/dev/null || true
mv EXPO_RUNNING.md archive/old_docs/ 2>/dev/null || true
mv FRESH_RESTART_COMPLETE.md archive/old_docs/ 2>/dev/null || true
mv FULL_APP_RESTARTED.md archive/old_docs/ 2>/dev/null || true
mv FULL_RESTART_STATUS.md archive/old_docs/ 2>/dev/null || true
mv RESTART_COMPLETE.md archive/old_docs/ 2>/dev/null || true
mv RESTART_STATUS.md archive/old_docs/ 2>/dev/null || true
mv SERVICES_RUNNING.md archive/old_docs/ 2>/dev/null || true
mv SYSTEM_STATUS.md archive/old_docs/ 2>/dev/null || true

# Fix files
mv FIX_APPLIED.md archive/old_docs/ 2>/dev/null || true
mv FIX_NETWORK_CONNECTION.md archive/old_docs/ 2>/dev/null || true
mv FIX_WEB_BUNDLING_ERROR.md archive/old_docs/ 2>/dev/null || true
mv FRONTEND_BACKEND_CONNECTION_FIX.md archive/old_docs/ 2>/dev/null || true
mv MOBILE_CONNECTION_FIX.md archive/old_docs/ 2>/dev/null || true
mv NETWORK_FIX_URGENT.md archive/old_docs/ 2>/dev/null || true
mv NETWORK_FIX.md archive/old_docs/ 2>/dev/null || true
mv WEB_ADMIN_PANEL_FIX.md archive/old_docs/ 2>/dev/null || true
mv WEB_BUNDLING_ISSUE_RESOLUTION.md archive/old_docs/ 2>/dev/null || true
mv WEB_DASHBOARD_CONFLICTS_RESOLVED.md archive/old_docs/ 2>/dev/null || true
mv WEB_VERSION_WORKING_SOLUTION.md archive/old_docs/ 2>/dev/null || true

echo "✅ Documentation archived!"
echo ""

# ==========================================
# Summary
# ==========================================

echo "📊 Cleanup Summary:"
echo "  ✅ Backup files removed"
echo "  ✅ Duplicate files removed"
echo "  ✅ Log files removed"
echo "  ✅ Archive tests removed"
echo "  ✅ Old documentation archived"
echo ""
echo "📁 Archived files location: archive/old_docs/"
echo ""
echo "✅ Cleanup complete!"
