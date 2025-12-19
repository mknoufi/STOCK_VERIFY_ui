# Start Backend and Expo with QR Code
# PowerShell script

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.FullName

Write-Host "🛑 Stopping all existing services..." -ForegroundColor Yellow

# Stop backend
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*python*" -and (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*backend\server.py*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop Expo/Metro
Get-Process node -ErrorAction SilentlyContinue | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*expo*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process npx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green

# Set PYTHONPATH for PowerShell
$env:PYTHONPATH = "$ProjectRoot;$env:PYTHONPATH"

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; `$env:PYTHONPATH = '$ProjectRoot;' + `$env:PYTHONPATH; python backend\server.py"

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🚀 Starting Expo with QR Code..." -ForegroundColor Green
Write-Host ""

# Start Expo in current window (to show QR code)
Set-Location "$ProjectRoot\frontend"
npx expo start --clear
