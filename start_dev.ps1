$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Launching Backend and Frontend in separate windows..."

Start-Process powershell -ArgumentList "-NoExit", "-File", "$ScriptDir\.scripts\start_backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", "$ScriptDir\.scripts\start_frontend.ps1"
