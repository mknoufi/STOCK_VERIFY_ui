# Start MongoDB
net start MongoDB

# Start Backend
Start-Process uvicorn "backend.server:app" --host 0.0.0.0 --port 8000 --workers 4

# Start Frontend (if exists)
if (Test-Path "frontend\build") {
    Push-Location frontend\build
    Start-Process http-server "-p 3000"
    Pop-Location
}

Write-Host "✓ Production services started"
