# Start Backend and Expo with QR Code
# PowerShell script

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.FullName

Write-Host "🛑 Stopping all existing services..." -ForegroundColor Yellow

# Helper function to get process command line (Windows only)
function Get-ProcessCommandLine {
    param([int]$ProcessId)
    if ($IsWindows -or $env:OS) {
        try {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
            return $proc.CommandLine
        } catch {
            return $null
        }
    }
    return $null
}

# Stop backend
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and ($cmdLine -like "*backend\server.py*" -or $cmdLine -like "*backend/server.py*")) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped backend process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Stop Expo/Metro
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and $cmdLine -like "*expo*") {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped Expo process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}
Get-Process npx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green

# Set PYTHONPATH for PowerShell
$env:PYTHONPATH = "$ProjectRoot;$env:PYTHONPATH"

# Start backend in new window
$BackendScript = "cd '$ProjectRoot'; `$env:PYTHONPATH = '$ProjectRoot;' + `$env:PYTHONPATH; python backend\server.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendScript

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🚀 Starting Expo with QR Code..." -ForegroundColor Green
Write-Host ""

# Start Expo in current window (to show QR code)
$FrontendPath = Join-Path $ProjectRoot "frontend"
Set-Location $FrontendPath
npx expo start --clear
