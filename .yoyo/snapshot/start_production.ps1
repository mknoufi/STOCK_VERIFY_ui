# Start MongoDB
net start MongoDB

# Start Backend
$BackendDir = Join-Path $PSScriptRoot "backend"
$env:PYTHONPATH = "$PSScriptRoot;$env:PYTHONPATH"
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4" -WorkingDirectory $PSScriptRoot

# Start Frontend (if exists)
if (Test-Path "frontend\build") {
    Push-Location frontend\build
    Start-Process http-server "-p 3000"
    Pop-Location
}

Write-Host "✓ Production services started"
