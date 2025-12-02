# Stop All Services
# PowerShell script for Windows

Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow

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

# Kill backend processes
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and $cmdLine -match "server\.py") {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped backend process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Kill frontend processes
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and ($cmdLine -match "expo" -or $cmdLine -match "metro")) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped frontend process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Kill processes on common ports (Windows only)
if ($IsWindows -or $env:OS) {
    $ports = @(8000, 8001, 8002, 8003, 8004, 8005, 8081, 19000, 19001)
    foreach ($port in $ports) {
        try {
            $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                         Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $processes) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "   Stopped process on port $port (PID: $pid)" -ForegroundColor Gray
                } catch {}
            }
        } catch {
            # Get-NetTCPConnection may not be available, ignore
        }
    }
}

Start-Sleep -Seconds 1

Write-Host "✅ All services stopped" -ForegroundColor Green
