# Start Both Services - Ensures only one instance of each runs
# PowerShell script for Windows

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🛑 Stopping all existing services..." -ForegroundColor Yellow
& "$ScriptDir\stop_all.ps1"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Starting backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir
    & ".\start_backend.ps1"
}

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🚀 Starting frontend..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir
    & ".\start_frontend.ps1"
}

Write-Host ""
Write-Host "✅ Services starting in background..." -ForegroundColor Green
Write-Host "   Backend Job ID: $($backendJob.Id)" -ForegroundColor Cyan
Write-Host "   Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "   Receive-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Receive-Job -Id $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "   & '$ScriptDir\stop_all.ps1'" -ForegroundColor Gray

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    & "$ScriptDir\stop_all.ps1"
}
