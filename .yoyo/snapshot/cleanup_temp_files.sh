#!/bin/bash
# Cleanup script for temporary markdown files
# Run this script from the project root: ./cleanup_temp_files.sh

set -e

echo "🧹 Stock Verify Cleanup Script"
echo "=============================="
echo ""

# Create backup directory
BACKUP_DIR=".backup_md_files_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# Function to safely remove files
cleanup_files() {
    local category="$1"
    shift
    local files=("$@")

    echo ""
    echo "📋 $category:"
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            cp "$file" "$BACKUP_DIR/" 2>/dev/null || true
            rm "$file"
            echo "   ✓ Removed: $file"
        fi
    done
}

# Category 1: Session/Runtime Status Files
STATUS_FILES=(
    "BACKEND_RUNNING.md"
    "BACKEND_START_STATUS.md"
    "BACKEND_STATUS.md"
    "EXPO_RUNNING.md"
    "EXPO_RESTARTED.md"
    "SERVICES_RUNNING.md"
    "SYSTEM_STATUS.md"
    "RESTART_STATUS.md"
    "RESTART_COMPLETE.md"
    "FULL_RESTART_STATUS.md"
    "FRESH_RESTART_COMPLETE.md"
    "APP_RESTARTED.md"
    "APP_FULLY_RESTARTED.md"
    "APP_SUCCESSFULLY_RESTARTED.md"
    "FULL_APP_RESTARTED.md"
    "ALL_SERVICES_STOPPED.md"
    "INTEGRATION_STATUS.md"
    "WEB_DASHBOARD_STATUS.md"
    "TEST_RESULTS.md"
    "SYSTEM_CHECK_REPORT.md"
    "FUNCTIONALITY_VERIFICATION.md"
    "VERIFIED_BRANCH_INFO.md"
    "WAIT_FOR_APP_LOADS.md"
)
cleanup_files "Session/Status Files" "${STATUS_FILES[@]}"

# Category 2: One-Time Fix Reports
FIX_FILES=(
    "FIX_APPLIED.md"
    "FIX_CODEBASE_COMPLETE.md"
    "FIX_NETWORK_CONNECTION.md"
    "FIX_WEB_BUNDLING_ERROR.md"
    "FIXES_APPLIED_SUMMARY.md"
    "FIXES_APPLIED_DEPENDENCIES.md"
    "AUDIT_FIXES_APPLIED.md"
    "BACKEND_URL_FIXED_FINAL.md"
    "DATABASE_CONNECTIVITY_FIX.md"
    "EXPO_FIX_COMPLETE.md"
    "FRONTEND_BACKEND_CONNECTION_FIX.md"
    "LOGIN_FIX_PROFESSIONAL.md"
    "LOGIN_FIX_SUMMARY.md"
    "MOBILE_CONNECTION_FIX.md"
    "MOBILE_LOGIN_FIX.md"
    "MONGODB_ITEMS_FIX.md"
    "MONGODB_RESTORE_COMPLETE.md"
    "NETWORK_FIX.md"
    "NETWORK_FIX_URGENT.md"
    "PYRIGHT_FIX_COMPLETE.md"
    "PYRIGHT_IMPORT_FIX.md"
    "PYRIGHT_SERVER_FIXES.md"
    "PYRIGHT_TYPE_ERRORS_FIXED.md"
    "STANDARDIZATION_COMPLETE.md"
    "WEB_ADMIN_PANEL_FIX.md"
    "WEB_BUNDLING_ISSUE_RESOLUTION.md"
    "WEB_DASHBOARD_CONFLICTS_RESOLVED.md"
    "WEB_VERSION_WORKING_SOLUTION.md"
    "WINDOWS_COMPATIBILITY_FIXES.md"
    "ALL_ISSUES_FIXED_SUMMARY.md"
    "ALL_12_TODOS_DONE.md"
)
cleanup_files "Fix Reports" "${FIX_FILES[@]}"

# Category 3: AI-Generated Analysis Reports
ANALYSIS_FILES=(
    "CODEBASE_ANALYSIS.md"
    "CODEBASE_AUDIT_DETAILED.md"
    "CODEBASE_AUDIT_REPORT.md"
    "CODEBASE_REPORT.md"
    "CODE_ERRORS_AND_DEPENDENCIES_REPORT.md"
    "CODE_HEALTH_REPORT.md"
    "CODE_IMPROVEMENTS.md"
    "CODE_UPGRADE_SUGGESTIONS.md"
    "COMPLETE_ERRORS_DEPENDENCIES_REPORT.md"
    "COMPREHENSIVE_CODE_ANALYSIS_REPORT.md"
    "COMPREHENSIVE_PROBLEMS_REPORT.md"
    "DEEP_CODEBASE_ANALYSIS.md"
    "DEPENDENCY_ISSUES_REPORT.md"
    "DETAILED_CODEBASE_REPORT.md"
    "EXPO_ROUTER_ISSUE_DIAGNOSTIC_REPORT.md"
    "EXPO_ROUTING_DEPENDENCY_ISSUES.md"
    "FINAL_ERRORS_DEPENDENCIES_SUMMARY.md"
    "FUNCTIONAL_ERRORS_REPORT.md"
    "IDE_WARNINGS_EXPLANATION.md"
    "ISSUE_ANALYSIS.md"
    "ISSUES_WARNINGS_SUGGESTIONS.md"
    "REMAINING_ISSUES_REPORT.md"
    "TYPESCRIPT_ERRORS_DETAILED.md"
    "TYPESCRIPT_ERRORS_REPORT.md"
    "UNUSED_FILES_REPORT.md"
    "UPGRADE_ISSUES_REPORT.md"
    "INTERNET_UPGRADE_ISSUES_REPORT.md"
)
cleanup_files "Analysis Reports" "${ANALYSIS_FILES[@]}"

# Category 4: Improvement/Enhancement Suggestions
IMPROVEMENT_FILES=(
    "ADDITIONAL_IMPROVEMENTS.md"
    "COMPREHENSIVE_APP_SUGGESTIONS.md"
    "COMPREHENSIVE_IMPROVEMENTS_PLAN.md"
    "CONTROL_PANEL_SUGGESTIONS.md"
    "FEATURE_UPGRADES_IMPLEMENTATION.md"
    "FINAL_IMPROVEMENTS_SUMMARY.md"
    "IMPROVEMENT_SUGGESTIONS.md"
    "IMPROVEMENTS_IMPLEMENTED.md"
    "RECOMMENDATIONS.md"
    "TOP_RECOMMENDATIONS.md"
    "UI_UX_IMPROVEMENTS.md"
    "UPGRADE_POSSIBILITIES.md"
    "UPGRADE_RECOMMENDATIONS.md"
    "UPGRADES_COMPLETED.md"
    "UPGRADES_SUMMARY.md"
)
cleanup_files "Improvement Suggestions" "${IMPROVEMENT_FILES[@]}"

# Category 5: Implementation Completion Reports
COMPLETION_FILES=(
    "ADMIN_PANEL_UI_UX_COMPLETE.md"
    "COMPREHENSIVE_MODERNIZATION_SUMMARY.md"
    "DYNAMIC_SYSTEMS_COMPLETION_REPORT.md"
    "IMPLEMENTATION_COMPLETE.md"
    "IMPLEMENTATION_SUMMARY.md"
    "MASTER_CONTROL_PANEL_COMPLETE.md"
    "QUICK_WINS_IMPLEMENTATION.md"
    "STOCK_VERIFY_CORE_COMPLETE.md"
    "WELCOME_SCREEN_IMPLEMENTATION.md"
)
cleanup_files "Completion Reports" "${COMPLETION_FILES[@]}"

# Category 6: Redundant Documentation
REDUNDANT_FILES=(
    "COMPLETE_DOCUMENTATION_INDEX.md"
    "DOCUMENTATION_INDEX.md"
    "COMPLETE_FILE_STRUCTURE.md"
    "PROJECT_DOCUMENTATION.md"
    "COMPREHENSIVE_APPLICATION_DOCUMENTATION.md"
)
cleanup_files "Redundant Documentation" "${REDUNDANT_FILES[@]}"

# Category 7: Redundant Quick Start Files
QUICKSTART_FILES=(
    "QUICK_INTEGRATION_GUIDE.md"
    "QUICK_REFERENCE.md"
    "QUICK_START_FRONTEND.md"
    "QUICK_TESTING_CHECKLIST.md"
    "QUICK_TEST_STEPS.md"
    "PRODUCTION_QUICK_START.md"
    "WELCOME_SCREEN_QUICK_START.md"
    "START_FRONTEND_POWERSHELL.md"
    "START_SERVICES_POWERSHELL.md"
    "MOBILE_BARCODE_SEARCH_TEST.md"
)
cleanup_files "Redundant Quick Start Files" "${QUICKSTART_FILES[@]}"

# Category 8: Outdated Plan Files
PLAN_FILES=(
    "CONTROL_PANEL_ROADMAP.md"
    "FEATURE_IMPLEMENTATION_PLAN.md"
    "IMPLEMENTATION_ROADMAP.md"
    "MODERNIZATION_PLAN.md"
    "STRATEGIC_ENHANCEMENTS_PLAN.md"
    "NEXT_STEPS_INTEGRATION.md"
    "PENDING_WORK_UPDATED.md"
)
cleanup_files "Outdated Plans" "${PLAN_FILES[@]}"

# Category 9: Cleanup Artifacts
ARTIFACT_FILES=(
    "CLEANUP_FILE_LIST.md"
    "CLEANUP_SUMMARY.md"
    "PRODUCTION_READINESS.md"
    "TEST_CONNECTION_RESULTS.md"
)
cleanup_files "Cleanup Artifacts" "${ARTIFACT_FILES[@]}"

# Category 10: Frontend Temporary Files
FRONTEND_FILES=(
    "frontend/QUICK_FIX_WEB_BLANK.md"
    "frontend/WEB_BLANK_FIX.md"
    "frontend/FINAL_STATUS.md"
    "frontend/QUICK_ERROR_CHECK.md"
    "frontend/ISSUE_FIXED.md"
    "frontend/READY_TO_TEST.md"
    "frontend/BACKEND_URL_FIX.md"
    "frontend/BACKEND_URL_FIXED.md"
    "frontend/FINAL_FIX_SUMMARY.md"
    "frontend/SUCCESS_APP_WORKING.md"
    "frontend/IMPORT_META_FINAL_FIX.md"
    "frontend/IMPORT_META_FIX.md"
    "frontend/IMPORT_META_COMPLETE_FIX.md"
    "frontend/ALL_FIXES_SUMMARY.md"
    "frontend/ANALYSIS_COMPLETE.md"
    "frontend/CLEAR_CACHE_AND_RESTART.md"
    "frontend/COMPLETE_FIX_APPLIED.md"
    "frontend/COMPREHENSIVE_ANALYSIS_GUIDE.md"
    "frontend/CONSOLE_ERRORS_FIX.md"
    "frontend/CRITICAL_FIX_APPLIED.md"
    "frontend/DEBUG_RUNTIME_ERRORS.md"
    "frontend/DEPENDENCY_FIX_SUMMARY.md"
    "frontend/ENV_CONFIGURATION_GUIDE.md"
    "frontend/ERROR_FINDING_GUIDE.md"
    "frontend/FINAL_SOLUTION.md"
    "frontend/FIXED_TEST_LOGGING.md"
    "frontend/FIX_DEPENDENCIES.md"
    "frontend/ISSUE_ANALYSIS.md"
    "frontend/LAYOUT_CONFLICT_FIXED.md"
    "frontend/MACOS_FIX_INSTRUCTIONS.md"
    "frontend/ROOT_CAUSE_FOUND.md"
    "frontend/RUN_ALL_DIAGNOSTICS.md"
    "frontend/RUN_ANALYSIS_NOW.md"
    "frontend/WEB_BLANK_TROUBLESHOOTING.md"
    "frontend/WHITE_PAGE_FIX.md"
)
cleanup_files "Frontend Temporary Files" "${FRONTEND_FILES[@]}"

# Count files removed
REMOVED_COUNT=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')

echo ""
echo "=============================="
echo "✅ Cleanup Complete!"
echo "   Files backed up to: $BACKUP_DIR"
echo "   Total files removed: $REMOVED_COUNT"
echo ""
echo "💡 To restore files, copy them back from $BACKUP_DIR"
echo "💡 To permanently delete backups: rm -rf $BACKUP_DIR"
