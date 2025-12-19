# Start Backend Server - Ensures only one instance runs
# PowerShell script for Windows

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "🔍 Checking for existing backend instances..." -ForegroundColor Yellow

# Kill existing backend processes
Get-Process | Where-Object {
    $_.ProcessName -match "python" -and
    $_.CommandLine -match "server\.py"
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill processes on common backend ports
$ports = @(8000, 8001, 8002, 8003, 8004, 8005)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   Killed process on port $port (PID: $processId)" -ForegroundColor Gray
        } catch {}
    }
}

Start-Sleep -Seconds 2

Write-Host "🚀 Starting backend server..." -ForegroundColor Green

Set-Location $BackendDir
$env:PYTHONPATH = "$ProjectRoot;$env:PYTHONPATH"

python server.py
