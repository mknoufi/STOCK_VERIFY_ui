# Start Frontend in New PowerShell Window
# PowerShell script for macOS/Windows

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.FullName
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host "🚀 Starting Frontend (Expo) in new window..." -ForegroundColor Green

# Check if we're on macOS or Windows
if ($IsMacOS -or $env:OS -eq $null) {
    # macOS - use osascript to open new Terminal window
    $escapedPath = $FrontendDir -replace "'", "''"
    $command = "cd '$escapedPath' && npx expo start --clear"
    $osascriptCommand = "tell application `"Terminal`" to do script `"$command`""
    osascript -e $osascriptCommand
    Write-Host "✅ Frontend starting in new Terminal window" -ForegroundColor Green
} else {
    # Windows - use Start-Process to open new PowerShell window
    $command = "cd '$FrontendDir'; npx expo start --clear"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
    Write-Host "✅ Frontend starting in new PowerShell window" -ForegroundColor Green
}

Write-Host ""
Write-Host "The new window will show:" -ForegroundColor Yellow
Write-Host "  • QR code for mobile scanning" -ForegroundColor Gray
Write-Host "  • Expo development server" -ForegroundColor Gray
Write-Host "  • Press 'w' for web, 'a' for Android, 'i' for iOS" -ForegroundColor Gray
