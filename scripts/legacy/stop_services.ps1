# Stop MongoDB if running
if ((Get-Service -Name MongoDB -ErrorAction SilentlyContinue).Status -eq 'Running') {
    net stop MongoDB
}

# Stop Uvicorn processes
taskkill /IM uvicorn.exe /F 2>&1 | Out-Null

# Stop Python processes in current directory
Get-Process python | Where-Object { $_.Path -like "*$PWD*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop Node processes on common ports
@(3000, 4200, 8080) | ForEach-Object {
    $port = $_
    $processId = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "All services stopped successfully"
