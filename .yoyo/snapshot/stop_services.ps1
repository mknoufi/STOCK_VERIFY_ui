# Stop MongoDB if running (Windows only)
if ($IsWindows -or $env:OS) {
    try {
        $mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
        if ($mongoService -and $mongoService.Status -eq 'Running') {
            net stop MongoDB
            Write-Host "   Stopped MongoDB service" -ForegroundColor Gray
        }
    } catch {
        # MongoDB service may not exist, ignore
    }
}

# Stop Uvicorn processes (Windows only)
if ($IsWindows -or $env:OS) {
    taskkill /IM uvicorn.exe /F 2>&1 | Out-Null
}

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

# Stop Python processes in current directory
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmdLine = Get-ProcessCommandLine -ProcessId $_.Id
        if ($cmdLine -and $cmdLine -like "*$PWD*") {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped Python process (PID: $($_.Id))" -ForegroundColor Gray
        }
    } catch {
        # Process may have exited, ignore
    }
}

# Stop Node processes on common ports (Windows only)
if ($IsWindows -or $env:OS) {
    @(3000, 4200, 8080) | ForEach-Object {
        $port = $_
        try {
            $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connection) {
                $processId = $connection.OwningProcess
                if ($processId) {
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Write-Host "   Stopped process on port $port (PID: $processId)" -ForegroundColor Gray
                }
            }
        } catch {
            # Get-NetTCPConnection may not be available, ignore
        }
    }
}

Write-Host "All services stopped successfully"
