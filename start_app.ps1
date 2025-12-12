# Start Stock Verify Application
# Comprehensive startup script for Windows

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stock Verify Application Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check MongoDB
Write-Host "Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoCheck = python -c "import pymongo; client = pymongo.MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000); client.server_info(); print('OK')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: MongoDB may not be running" -ForegroundColor Yellow
        Write-Host "  Please ensure MongoDB is started before continuing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  WARNING: Could not verify MongoDB connection" -ForegroundColor Yellow
}

# Check backend .env file
Write-Host "Checking backend configuration..." -ForegroundColor Yellow
$envFile = Join-Path $BackendDir ".env"
if (Test-Path $envFile) {
    Write-Host "  Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Backend .env file not found!" -ForegroundColor Red
    Write-Host "  Generating secrets..." -ForegroundColor Yellow
    Set-Location $BackendDir
    python scripts\generate_secrets.py --write
    Set-Location $ScriptDir
}

# Check Python dependencies
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
$requiredPackages = @("fastapi", "uvicorn", "motor", "pymongo")
$missingPackages = @()
foreach ($package in $requiredPackages) {
    $installed = python -m pip show $package 2>&1
    if ($LASTEXITCODE -ne 0) {
        $missingPackages += $package
    }
}
if ($missingPackages.Count -eq 0) {
    Write-Host "  All Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  Installing missing Python packages..." -ForegroundColor Yellow
    Set-Location $BackendDir
    python -m pip install -r requirements.txt
    Set-Location $ScriptDir
}

# Check frontend dependencies
Write-Host "Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path (Join-Path $FrontendDir "node_modules")) {
    Write-Host "  Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm install
    Set-Location $ScriptDir
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start backend in new window
Write-Host "  Starting backend server (port 8001)..." -ForegroundColor Cyan
$backendCommand = "cd '$BackendDir'; `$env:PYTHONPATH='$ScriptDir'; python -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "  Starting frontend (Expo)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npx expo start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: http://localhost:8001" -ForegroundColor Yellow
Write-Host "API Docs:    http://localhost:8001/docs" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:8081" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit (services will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

