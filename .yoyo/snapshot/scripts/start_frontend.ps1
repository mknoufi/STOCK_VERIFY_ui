# Start Frontend (Expo) - Ensures only one instance runs
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
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host "🔍 Checking for existing frontend instances..." -ForegroundColor Yellow

# Kill existing Expo/Metro processes
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and ($cmdLine -match "expo" -or $cmdLine -match "metro")) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Killed existing Expo/Metro process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Kill processes on common frontend ports (Windows only)
if ($IsWindows -or $env:OS) {
    $ports = @(8081, 19000, 19001)
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

Write-Host "🚀 Starting frontend (Expo)..." -ForegroundColor Green

Set-Location $FrontendDir

# Clear caches
Remove-Item -Path ".metro-cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
if ($env:USERPROFILE -and (Test-Path "$env:USERPROFILE\.expo\cache")) {
    Remove-Item -Path "$env:USERPROFILE\.expo\cache" -Recurse -Force -ErrorAction SilentlyContinue
} elseif ($env:HOME -and (Test-Path "$env:HOME\.expo\cache")) {
    Remove-Item -Path "$env:HOME\.expo\cache" -Recurse -Force -ErrorAction SilentlyContinue
}

npx expo start --web --clear
