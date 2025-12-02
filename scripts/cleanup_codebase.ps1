# Codebase Cleanup Script (PowerShell)
# Safely removes backup, duplicate, and temporary files

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "🧹 Starting codebase cleanup..." -ForegroundColor Yellow
Write-Host "Project root: $ProjectRoot" -ForegroundColor DarkYellow
Write-Host ""

# Create archive directory
New-Item -ItemType Directory -Force -Path "archive\old_docs" | Out-Null

# ==========================================
# HIGH PRIORITY - Safe to Delete
# ==========================================

Write-Host "🔴 Removing backup and duplicate files..." -ForegroundColor Red

# Frontend backup files
Remove-Item -Path "frontend\app\*.backup" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\app\welcome.backup.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\app\_layout.original.backup" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\app\index.tsx.backup" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\app\_layout.tsx.backup" -Force -ErrorAction SilentlyContinue

# Backend duplicate files
Remove-Item -Path "backend\server2.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "backend\test_modules.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "backend\test_server.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "backend\capture_login_error.py" -Force -ErrorAction SilentlyContinue

# Unused utility (structured_logger.py is newer but unused, structured_logging.py is used)
Remove-Item -Path "backend\utils\structured_logger.py" -Force -ErrorAction SilentlyContinue

# Root test files
Remove-Item -Path "test_modules.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test_server.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test_new_features.py" -Force -ErrorAction SilentlyContinue

# Archive test files
if (Test-Path "backend\tests\archive") {
    Write-Host "  Removing archive test files..." -ForegroundColor DarkYellow
    Remove-Item -Path "backend\tests\archive" -Recurse -Force -ErrorAction SilentlyContinue
}

# Log files
Write-Host "🔴 Removing log files..." -ForegroundColor Red
Remove-Item -Path "*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "backend*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "debug.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "TEST_OUTPUT.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "query" -Force -ErrorAction SilentlyContinue

Write-Host "✅ High priority cleanup complete!" -ForegroundColor Green
Write-Host ""

# ==========================================
# MEDIUM PRIORITY - Review Before Deleting
# ==========================================

Write-Host "🟡 Review these files before deleting:" -ForegroundColor Yellow
Write-Host "  • 2777.png"
Write-Host "  • lavanya_emart_logo_page_2.png"
Write-Host "  • WhatsApp Image 2025-11-05 at 23.09.38_1b1c8b07.jpg"
Write-Host "  • LAVANYA E MART LOGO BOOK.pdf"
Write-Host ""
Write-Host "  Check if these are used in the app before removing." -ForegroundColor DarkYellow
Write-Host ""

# ==========================================
# LOW PRIORITY - Archive Old Documentation
# ==========================================

Write-Host "🟢 Archiving old documentation files..." -ForegroundColor Cyan

# Status files
$StatusFiles = @(
    "ALL_12_TODOS_DONE.md",
    "ALL_SERVICES_STOPPED.md",
    "APP_FULLY_RESTARTED.md",
    "APP_RESTARTED.md",
    "APP_SUCCESSFULLY_RESTARTED.md",
    "BACKEND_RUNNING.md",
    "BACKEND_START_STATUS.md",
    "BACKEND_STATUS.md",
    "BACKEND_URL_FIXED_FINAL.md",
    "EXPO_FIX_COMPLETE.md",
    "EXPO_RESTARTED.md",
    "EXPO_RUNNING.md",
    "FRESH_RESTART_COMPLETE.md",
    "FULL_APP_RESTARTED.md",
    "FULL_RESTART_STATUS.md",
    "RESTART_COMPLETE.md",
    "RESTART_STATUS.md",
    "SERVICES_RUNNING.md",
    "SYSTEM_STATUS.md"
)

foreach ($file in $StatusFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "archive\old_docs\" -Force -ErrorAction SilentlyContinue
    }
}

# Fix files
$FixFiles = @(
    "FIX_APPLIED.md",
    "FIX_NETWORK_CONNECTION.md",
    "FIX_WEB_BUNDLING_ERROR.md",
    "FRONTEND_BACKEND_CONNECTION_FIX.md",
    "MOBILE_CONNECTION_FIX.md",
    "NETWORK_FIX_URGENT.md",
    "NETWORK_FIX.md",
    "WEB_ADMIN_PANEL_FIX.md",
    "WEB_BUNDLING_ISSUE_RESOLUTION.md",
    "WEB_DASHBOARD_CONFLICTS_RESOLVED.md",
    "WEB_VERSION_WORKING_SOLUTION.md"
)

foreach ($file in $FixFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "archive\old_docs\" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "✅ Documentation archived!" -ForegroundColor Green
Write-Host ""

# ==========================================
# Summary
# ==========================================

Write-Host "📊 Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Backup files removed" -ForegroundColor Green
Write-Host "  ✅ Duplicate files removed" -ForegroundColor Green
Write-Host "  ✅ Log files removed" -ForegroundColor Green
Write-Host "  ✅ Archive tests removed" -ForegroundColor Green
Write-Host "  ✅ Old documentation archived" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Archived files location: archive\old_docs\" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
