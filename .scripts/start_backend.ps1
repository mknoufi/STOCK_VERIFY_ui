$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

Write-Host "Checking for virtual environment..."
if (Test-Path ".venv\Scripts\python.exe") {
    $python = ".\.venv\Scripts\python.exe"
    Write-Host "Using .venv"
} elseif (Test-Path "venv\Scripts\python.exe") {
    $python = ".\venv\Scripts\python.exe"
    Write-Host "Using venv"
} else {
    $python = "python"
    Write-Host "Using system python (virtualenv not found)"
}

Write-Host "Starting Backend..."
& $python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
