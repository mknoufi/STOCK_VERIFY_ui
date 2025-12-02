# Start Backend Server - Ensures only one instance runs
# PowerShell script for Windows

$ErrorActionPreference = "Stop"

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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "🔍 Checking for existing backend instances..." -ForegroundColor Yellow

# Kill existing backend processes
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and $cmdLine -match "server\.py") {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Killed existing backend process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Kill processes on common backend ports (Windows only)
if ($IsWindows -or $env:OS) {
    $ports = @(8000, 8001, 8002, 8003, 8004, 8005)
    foreach ($port in $ports) {
        try {
            $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                         Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $processes) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "   Killed process on port $port (PID: $pid)" -ForegroundColor Gray
                } catch {}
            }
        } catch {
            # Get-NetTCPConnection may not be available, ignore
        }
    }
}

Start-Sleep -Seconds 2

Write-Host "🚀 Starting backend server..." -ForegroundColor Green

Set-Location $BackendDir
$env:PYTHONPATH = "$ProjectRoot;$env:PYTHONPATH"

python server.py
