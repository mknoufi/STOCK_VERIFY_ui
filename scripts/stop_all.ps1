# Stop All Services
# PowerShell script for Windows

Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow

# Kill backend processes
Get-Process | Where-Object {
    $_.ProcessName -match "python" -and
    $_.CommandLine -match "server\.py"
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill frontend processes
Get-Process | Where-Object {
    $_.ProcessName -match "node" -and
    ($_.CommandLine -match "expo" -or $_.CommandLine -match "metro")
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill processes on common ports
$ports = @(8000, 8001, 8002, 8003, 8004, 8005, 8081, 19000, 19001)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

Start-Sleep -Seconds 1

Write-Host "✅ All services stopped" -ForegroundColor Green
